const test = require('node:test')
const assert = require('node:assert/strict')
const { loadPage, baselineCommit, clone } = require('./helpers/uiRegressionHarness')

// All cloud/privacy APIs are deterministic mocks. These tests never write real users or consent state.
async function tracePrivacy(revision, scenario) {
  const events = []
  const users = scenario.status ? [{ status: scenario.status, role: scenario.role || 'user' }] : []
  const database = {
    collection(name) {
      events.push(['collection', name])
      return {
        where(query) {
          events.push(['where', query])
          return { get: async () => { events.push(['get']); return { data: users } } }
        },
        async add(options) { events.push(['add', options.data]); return {} }
      }
    },
    serverDate: () => 'mock-server-date'
  }
  const wx = {
    cloud: {
      init(options) { events.push(['init', options]) },
      database: () => database,
      async callFunction(options) { events.push(['callFunction', options]); return { result: { openid: 'test-openid' } } }
    },
    showToast(options) { events.push(['toast', options.title]) },
    showModal(options) { events.push(['modal', options.title, options.content]); if (options.success) options.success({ confirm: true }) },
    redirectTo(options) { events.push(['redirect', options.url]) },
    getStorageSync(key) { events.push(['storage-read', key]); return '' },
    setStorageSync(key, value) { events.push(['storage-write', key, value]) },
    requirePrivacyAuthorize: scenario.auth === 'unavailable' ? undefined : options => {
      events.push(['authorize'])
      if (scenario.auth === 'reject') options.fail({ errMsg: 'privacy authorization denied' })
      else options.success()
    },
    openPrivacyContract: scenario.contract === 'unavailable' ? undefined : options => {
      events.push(['contract'])
      if (scenario.contract === 'fail') options.fail()
    }
  }
  const file = scenario.app ? 'app.js' : 'pages/apply/apply.js'
  const { page } = loadPage(file, { revision, wx, globals: {
    setTimeout(fn, delay) { events.push(['timer', delay]); fn(); return 0 }
  } })
  if (scenario.app) page.onLaunch()
  else if (scenario.submit) {
    page.setData({ companyName: '测试公司', contactName: '测试用户', phone: '13800138000' })
    if (scenario.agree) page.onAgreeCheck()
    page.onSubmit()
  } else if (scenario.contract) page.showPrivacyPolicy()
  else page.onLoad()
  // Drain nested promise callbacks used by unchanged app/apply code.
  for (let index = 0; index < 12; index++) await Promise.resolve()
  return clone({ events, data: page.data, globalData: page.globalData || null })
}

const scenarios = [
  { name: 'first entry with no user', app: true },
  { name: 'already approved user reenters', app: true, status: 'approved' },
  { name: 'approved admin retains role and route', app: true, status: 'approved', role: 'admin' },
  { name: 'pending applicant', app: true, status: 'pending' },
  { name: 'rejected applicant and original redirect', app: true, status: 'rejected' },
  { name: 'first apply page has unchecked agreement' },
  { name: 'apply page approved redirect', status: 'approved' },
  { name: 'apply page pending redirect', status: 'pending' },
  { name: 'apply page rejected notice', status: 'rejected' },
  { name: 'cannot submit without agreeing', submit: true },
  { name: 'official privacy authorization refused', submit: true, agree: true, auth: 'reject' },
  { name: 'official privacy authorization completed', submit: true, agree: true, auth: 'success' },
  { name: 'legacy API-unavailable fallback', submit: true, agree: true, auth: 'unavailable' },
  { name: 'open official privacy contract', contract: 'success' },
  { name: 'privacy contract failure fallback', contract: 'fail' },
  { name: 'privacy contract unavailable fallback', contract: 'unavailable' }
]

for (const scenario of scenarios) {
  test(`privacy baseline comparison: ${scenario.name}`, async () => {
    const original = await tracePrivacy(baselineCommit, scenario)
    const current = await tracePrivacy(undefined, scenario)
    assert.deepEqual(current, original)
    const names = current.events.map(event => event[0])
    if (scenario.submit && (!scenario.agree || scenario.auth === 'reject')) {
      assert.equal(names.includes('add'), false)
      assert.equal(names.includes('redirect'), false)
    }
    if (scenario.submit && scenario.agree && scenario.auth !== 'reject') {
      assert.equal(names.filter(name => name === 'add').length, 1)
      assert.deepEqual(current.events.at(-1), ['redirect', '/pages/pending/pending'])
      if (scenario.auth === 'success') assert.ok(names.indexOf('authorize') < names.indexOf('add'))
    }
    if (scenario.status === 'approved') assert.deepEqual(current.events.at(-1), ['redirect', '/pages/quote/quote'])
  })
}
