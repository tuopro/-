const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')

function loadApplyPage(wxOverrides = {}) {
  let definition = null
  global.wx = {
    cloud: {
      database() {
        return {
          collection() {
            return {
              where() { return { get: async () => ({ data: [] }) } },
              add: async () => ({})
            }
          },
          serverDate() { return new Date(0) }
        }
      },
      callFunction: async () => ({ result: { openid: 'test-openid' } })
    },
    showToast() {},
    showModal() {},
    openPrivacyContract() {},
    requirePrivacyAuthorize() {},
    redirectTo() {},
    ...wxOverrides
  }
  global.Page = config => { definition = config }

  const pagePath = path.join(root, 'pages/apply/apply.js')
  delete require.cache[require.resolve(pagePath)]
  require(pagePath)

  return {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(patch, callback) {
      Object.assign(this.data, patch)
      if (callback) callback()
    }
  }
}

test('app enables the official WeChat privacy check', () => {
  const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
  assert.equal(appConfig.__usePrivacyCheck__, true)
})

test('agreement is always visible inside the application form', () => {
  const wxml = fs.readFileSync(path.join(root, 'pages/apply/apply.wxml'), 'utf8')
  const submitButton = wxml.indexOf('<button class="submit-btn"')
  const agreement = wxml.indexOf('privacy-agreement-card')

  assert.equal(agreement > 0 && agreement < submitButton, true)
  assert.equal(wxml.includes('privacy-overlay'), false)
  assert.equal(wxml.includes('《用户服务协议》'), true)
  assert.equal(wxml.includes('《用户隐私保护指引》'), true)
})

test('privacy guide opens the official WeChat privacy contract', () => {
  let opened = 0
  const page = loadApplyPage({
    openPrivacyContract() { opened += 1 }
  })

  page.showPrivacyPolicy()

  assert.equal(opened, 1)
})

test('submit requires visible agreement and official privacy authorization', () => {
  const toasts = []
  let required = 0
  let submitted = 0
  const page = loadApplyPage({
    showToast(options) { toasts.push(options.title) },
    requirePrivacyAuthorize(options) {
      required += 1
      options.success()
    }
  })
  page.data.companyName = '德赛'
  page.data.contactName = '张三'
  page.data.phone = '13800138000'
  page.doSubmit = () => { submitted += 1 }

  page.data.privacyChecked = false
  page.onSubmit()
  assert.equal(toasts.at(-1), '请先阅读并同意协议')
  assert.equal(submitted, 0)

  page.data.privacyChecked = true
  page.onSubmit()
  assert.equal(required, 1)
  assert.equal(submitted, 1)
})
