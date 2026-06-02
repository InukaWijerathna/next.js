import { nextTestSetup } from 'e2e-utils'

describe('sync IO that blocks the root', () => {
  const { next } = nextTestSetup({
    files: __dirname,
    skipStart: true,
  })

  it.each([
    {
      description: 'production',
      isDebugPrerender: false,
    },
    {
      description: 'with --debug-prerender',
      isDebugPrerender: true,
    },
  ])(
    'does not hang the build and reports sync IO errors - $description',
    async ({ isDebugPrerender }) => {
      const result = await next.build({
        args: isDebugPrerender ? ['--debug-prerender'] : undefined,
      })

      expect(result.cliOutput).toContain(
        'Error: Route "/": Next.js encountered the unstable value `Date.now()` while prerendering.'
      )
      expect(result.cliOutput).not.toMatch(
        /Failed to build .*? because it took more than \d+ seconds\. Retrying again shortly\./
      )
      expect(result.exitCode).toBe(1)
    }
  )
})
