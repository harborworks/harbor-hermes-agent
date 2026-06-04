const assert = require('node:assert/strict')
const test = require('node:test')

const { installScriptUrl, runBootstrap } = require('./bootstrap-runner.cjs')

test('installScriptUrl defaults to the Harbor fork for pinned bootstrap downloads', () => {
  assert.equal(
    installScriptUrl('a4f15e90086a', 'install.sh'),
    'https://raw.githubusercontent.com/harborworks/harbor-hermes-agent/a4f15e90086a/scripts/install.sh'
  )
})

test('installScriptUrl supports overriding the bootstrap source repository', () => {
  const previous = process.env.HERMES_DESKTOP_INSTALL_REPO
  process.env.HERMES_DESKTOP_INSTALL_REPO = 'example/fork'
  try {
    assert.equal(
      installScriptUrl('a4f15e90086a', 'install.sh'),
      'https://raw.githubusercontent.com/example/fork/a4f15e90086a/scripts/install.sh'
    )
  } finally {
    if (previous === undefined) {
      delete process.env.HERMES_DESKTOP_INSTALL_REPO
    } else {
      process.env.HERMES_DESKTOP_INSTALL_REPO = previous
    }
  }
})

test('runBootstrap bails immediately when the signal is already aborted', async () => {
  const controller = new AbortController()
  controller.abort()

  const events = []
  const result = await runBootstrap({
    installStamp: null,
    activeRoot: '/tmp/hermes-runner-test',
    sourceRepoRoot: null,
    hermesHome: '/tmp/hermes-runner-test',
    logRoot: '/tmp/hermes-runner-test',
    onEvent: ev => events.push(ev),
    abortSignal: controller.signal
  })

  // Cancelled before any install script is spawned.
  assert.deepEqual(result, { ok: false, cancelled: true })
  assert.ok(
    events.some(ev => ev.type === 'failed' && /cancelled/i.test(ev.error)),
    'should emit a cancelled failure event'
  )
})
