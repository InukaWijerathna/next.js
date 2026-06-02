// @ts-check
const fs = require('fs')
const path = require('path')
const execa = require('execa')
const resolveFrom = require('resolve-from')
const {
  configureGitHubAuth,
  getGitHubToken,
  getGitHubTokenMissingMessage,
  verifyGitHubApiAccess,
} = require('./release-github-auth')
const { createGitHubReleaseCommit } = require('./release-github-api')

const SEMVER_TYPES = ['patch', 'minor', 'major']

async function main() {
  const args = process.argv
  const releaseType = args[args.indexOf('--release-type') + 1]
  const semverType = args[args.indexOf('--semver-type') + 1]
  const isCanary = releaseType === 'canary'
  const isReleaseCandidate = releaseType === 'release-candidate'
  const isBeta = releaseType === 'beta'

  if (
    releaseType !== 'stable' &&
    releaseType !== 'canary' &&
    releaseType !== 'release-candidate' &&
    releaseType !== 'beta'
  ) {
    console.log(
      `Invalid release type ${releaseType}, must be stable, canary, release-candidate, or beta`
    )
    return
  }
  if (!isCanary && !SEMVER_TYPES.includes(semverType)) {
    console.log(
      `Invalid semver type ${semverType}, must be one of ${SEMVER_TYPES.join(
        ', '
      )}`
    )
    return
  }

  const githubToken = getGitHubToken()

  if (!githubToken) {
    console.log(getGitHubTokenMissingMessage())
    return
  }

  const configStorePath = resolveFrom(
    path.join(process.cwd(), 'node_modules/release'),
    'configstore'
  )
  const ConfigStore = require(configStorePath)

  const config = new ConfigStore('release')
  config.set('token', githubToken)

  await configureGitHubAuth(githubToken)
  await verifyGitHubApiAccess(
    githubToken,
    '/repos/vercel/next.js/releases?per_page=1',
    'release lookup'
  )

  // random change to make the commit not empty
  fs.writeFileSync(
    path.join(process.cwd(), '.version'),
    `// This file was modified at ${new Date().toISOString()} to trigger a new release commit\n`
  )
  await execa('git', ['add', '.version'], {
    stdio: 'inherit',
  })
  await execa('git', ['commit', '-m', 'chore: create release commit'], {
    stdio: 'inherit',
  })

  await createGitHubReleaseCommit(githubToken)

  if (isCanary || isReleaseCandidate || isBeta) {
    const releaseChild = execa(
      'pnpm',
      ['release', '--pre', '--skip-questions', '--show-url'],
      {
        stdio: 'inherit',
      }
    )

    await releaseChild
  }

  console.log('Release process is finished')
}

main()
