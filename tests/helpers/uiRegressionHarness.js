const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const { execFileSync } = require('node:child_process')
const crypto = require('node:crypto')

const root = path.resolve(__dirname, '../..')
const baselineCommit = 'e994214326df45de12c4c17899bd1f299fe6032e'
const quotePath = 'pages/quote/quote.js'
const resultPath = 'pages/quoteResult/quoteResult.js'
const clone = value => JSON.parse(JSON.stringify(value))
const hash = value => crypto.createHash('sha256').update(value).digest('hex')

function sourceAt(file, revision) {
  return revision
    ? execFileSync('git', ['show', `${revision}:${file}`], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(path.join(root, file), 'utf8')
}

function loadPage(file, { revision, wx: overrides = {}, app, globals = {} } = {}) {
  let definition
  let tick = 0
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-09-12T04:00:00Z'])) }
    static now() { return 1789185600000 + tick++ }
  }
  const calls = []
  const wx = {
    showToast(options) { calls.push(['toast', options.title]) },
    showModal(options) { calls.push(['modal', options.title]) },
    getStorageSync() { return '' },
    setStorageSync(key, value) { calls.push(['storage', key, value]) },
    hideKeyboard() {},
    pageScrollTo() {},
    nextTick(fn) { fn() },
    navigateBack() {},
    setClipboardData(options) { calls.push(['clipboard', options.data]); if (options.success) options.success() },
    ...overrides
  }
  const context = {
    Page(config) { definition = config },
    App(config) { definition = config },
    wx,
    getApp: () => app || { globalData: { isAdmin: false, quoteData: null } },
    getCurrentPages: () => [],
    require: createRequire(path.join(root, file)),
    Date: FixedDate,
    console,
    setTimeout(fn) { fn(); return 0 },
    clearTimeout() {},
    ...globals
  }
  vm.runInNewContext(sourceAt(file, revision), context, { filename: file })
  const page = {
    ...definition,
    data: clone(definition.data || {}),
    setData(patch, callback) { Object.assign(this.data, clone(patch)); if (callback) callback() }
  }
  return { page, calls, wx, definition }
}

function selectProduct(page, height, width, teeth = '粗齿') {
  page.onHeightTap({ currentTarget: { dataset: { value: height } } })
  page.onWidthTap({ currentTarget: { dataset: { value: width } } })
  page.onTeethTap({ currentTarget: { dataset: { value: teeth } } })
}

function addProduct(page, row) {
  selectProduct(page, row.h, row.w, row.teeth || '粗齿')
  if (page.data.quoteMode === 'fixed') {
    page.onFixedLengthInput({ detail: { value: String(row.length) } })
    page.onFixedQuantityInput({ detail: { value: String(row.quantity) } })
  } else {
    page.onMetersInput({ detail: { value: String(row.meters) } })
  }
  page.addToCart()
}

const scenarios = [
  { name: 'standard-design-example', rows: [{ h: 40, w: 40, meters: 100 }, { h: 60, w: 40, meters: 100 }] },
  { name: 'standard-example-logistics', transport: 'logistics', rows: [{ h: 40, w: 40, meters: 100 }, { h: 60, w: 40, meters: 100 }] },
  { name: 'standard-non-full-boxes', rows: [{ h: 80, w: 50, meters: 125.5 }, { h: 60, w: 40, teeth: '封口', meters: 201 }] },
  { name: 'standard-minimum-freight', rows: [{ h: 40, w: 40, meters: 1 }] },
  { name: 'standard-no-freight', freight: false, rows: [{ h: 40, w: 40, meters: 100 }] },
  { name: 'standard-unconfigured-region', province: '香港特别行政区', rows: [{ h: 40, w: 40, meters: 100 }] },
  { name: 'standard-no-discount', noDiscount: true, rows: [{ h: 40, w: 40, meters: 100 }] },
  { name: 'standard-custom-discount', discount: '9.1', rows: [{ h: 40, w: 40, meters: 100 }] },
  { name: 'standard-full-seal-weight', province: '北京市', rows: [{ h: 40, w: 40, teeth: '全封闭', meters: 150 }] },
  { name: 'standard-edit-delete', edit: true, rows: [{ h: 40, w: 40, meters: 100 }, { h: 60, w: 40, meters: 100 }] },
  { name: 'fixed-0.6', mode: 'fixed', rows: [{ h: 40, w: 40, length: 0.6, quantity: 10 }] },
  { name: 'fixed-full-seal', mode: 'fixed', rows: [{ h: 40, w: 40, teeth: '全封闭', length: 0.6, quantity: 10 }] },
  { name: 'fixed-non-divisor', mode: 'fixed', rows: [{ h: 60, w: 40, length: 0.7, quantity: 101 }] },
  { name: 'fixed-no-freight-edit', mode: 'fixed', freight: false, edit: true, rows: [{ h: 40, w: 40, length: 2, quantity: 10 }, { h: 60, w: 40, length: 0.4, quantity: 20 }] },
  { name: 'foreign-default', mode: 'foreign', rows: [{ h: 40, w: 40, meters: 100 }, { h: 60, w: 40, meters: 100 }] },
  { name: 'foreign-non-full-box', mode: 'foreign', rows: [{ h: 40, w: 40, meters: 151.5 }, { h: 80, w: 80, teeth: '全封闭', meters: 37 }] },
  { name: 'foreign-rate-discount-edit', mode: 'foreign', rate: '7.25', discount: '9.1', edit: true, rows: [{ h: 40, w: 40, meters: 100 }, { h: 60, w: 40, meters: 100 }] }
]

function runScenario(scenario, revision) {
  const { page } = loadPage(quotePath, { revision })
  const originalKeys = Object.keys(loadPage(quotePath, { revision: baselineCommit }).page.data)
  if (scenario.mode) page.applyQuoteMode(scenario.mode)
  scenario.rows.forEach(row => addProduct(page, row))
  page.onRegionChange({ detail: { value: [scenario.province || '浙江省', '杭州市', ''] } })
  page.onFreightSwitch({ detail: { value: scenario.freight !== false } })
  if (scenario.transport) page.onTransportChange({ detail: { value: scenario.transport } })
  if (scenario.noDiscount) page.onDiscountTypeChange({ detail: { value: '1' } })
  if (scenario.discount) {
    const foreign = scenario.mode === 'foreign'
    page[foreign ? 'onForeignDiscountTypeChange' : 'onDiscountTypeChange']({ detail: { value: '2' } })
    page[foreign ? 'onForeignDiscountBlur' : 'onDiscountBlur']({ detail: { value: scenario.discount } })
  }
  if (scenario.rate) page.onForeignExchangeRateBlur({ detail: { value: scenario.rate } })
  if (scenario.edit) {
    page[scenario.mode === 'fixed' ? 'onCartFixedQuantityInput' : 'onCartMetersInput']({ currentTarget: { dataset: { id: page.data.cart[0].id } }, detail: { value: '137' } })
    page.removeCartItem({ currentTarget: { dataset: { id: page.data.cart[1].id } } })
  }
  let payload
  page.navigateToResult = data => { payload = clone(data) }
  page.onSubmit()
  if (!payload) throw new Error(`Scenario did not produce quotation: ${scenario.name}`)
  const result = loadPage(resultPath, { revision })
  result.page.initData(payload)
  result.page.onCopy()
  const drawCalls = []
  const ctx = new Proxy({}, {
    set(target, key, value) { drawCalls.push(['set', key, value]); target[key] = value; return true },
    get(target, key) { return target[key] || ((...args) => { drawCalls.push([key, ...args]); return { width: 0 } }) }
  })
  const canvasHeight = result.page.calcCanvasHeight(result.page.data.productList.length, result.page.data.quoteMode)
  result.page.drawQuoteByMode(ctx, result.page.data, canvasHeight)
  return {
    state: Object.fromEntries(originalKeys.map(key => [key, clone(page.data[key])])),
    payload,
    copiedText: result.calls.find(call => call[0] === 'clipboard')[1],
    canvasHeight,
    canvasDrawHash: hash(JSON.stringify(drawCalls))
  }
}

module.exports = { root, baselineCommit, quotePath, resultPath, clone, hash, sourceAt, loadPage, selectProduct, addProduct, scenarios, runScenario }
