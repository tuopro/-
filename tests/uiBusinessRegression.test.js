const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const baseline = require('../docs/ui-proposals/2026-09-12/ui-baseline.json')
const { root, baselineCommit, quotePath, resultPath, clone, hash, loadPage, addProduct, scenarios, runScenario } = require('./helpers/uiRegressionHarness')
const state = (page, file = quotePath) => {
  const keys = Object.keys(loadPage(file, { revision: baselineCommit }).page.data)
  return clone(Object.fromEntries(keys.map(key => [key, page.data[key]])))
}

test('all 43 protected tracked files remain byte-identical to the pre-edit baseline', () => {
  const protectedFiles = Object.entries(baseline.hashes).filter(([file]) => !baseline.editable.includes(file))
  assert.equal(protectedFiles.length, 43)
  for (const [file, expected] of protectedFiles) assert.equal(hash(fs.readFileSync(path.join(root, file))), expected, file)
})

test('all 43 original page methods and original initial business values are unchanged', () => {
  let count = 0
  for (const file of [quotePath, resultPath]) {
    const { page, definition } = loadPage(file)
    for (const [name, expected] of Object.entries(baseline.methods[file])) {
      assert.equal(hash(definition[name].toString()), expected, `${file}:${name}`)
      count++
    }
    assert.deepEqual(state(page, file), loadPage(file, { revision: baselineCommit }).page.data)
  }
  assert.equal(count, 43)
})

for (const scenario of scenarios) {
  test(`frozen quotation regression: ${scenario.name}`, () => {
    assert.deepEqual(runScenario(scenario), baseline.scenarios[scenario.name])
  })
}

test('approved example keeps every stated amount, weight and piece count', () => {
  const data = runScenario(scenarios[1]).payload
  const expected = { productTotal: 1078, discountedTotal: 1056.44, noTaxTotal: 960.40, totalWeight: 93, totalPieces: 2, expressFreight: 65.10, logisticsFreight: 30, expressTotal: 1121.54, logisticsTotal: 1086.44, expressTotalNoTax: 1025.50, logisticsTotalNoTax: 990.40 }
  for (const [key, value] of Object.entries(expected)) assert.equal(Number(data[key]), value, key)
})

test('delivery cards reuse original switch/change handlers in standard and fixed modes', () => {
  for (const mode of ['standard', 'fixed']) {
    const current = loadPage(quotePath).page
    const original = loadPage(quotePath, { revision: baselineCommit }).page
    for (const page of [current, original]) {
      page.applyQuoteMode(mode)
      addProduct(page, { h: 40, w: 40, meters: 100, length: 0.6, quantity: 10 })
      page.onRegionChange({ detail: { value: ['浙江省', '杭州市', ''] } })
    }
    for (const value of ['none', 'express', 'logistics', 'none', 'express']) {
      current.onUIDeliveryTap({ currentTarget: { dataset: { value } } })
      if (!(mode === 'fixed' && value === 'logistics')) {
        if (original.data.includeFreight !== (value !== 'none')) original.onFreightSwitch({ detail: { value: value !== 'none' } })
        if (value !== 'none') original.onTransportChange({ detail: { value } })
      }
      assert.deepEqual(state(current), state(original), `${mode}:${value}`)
    }
  }
})

test('UI sections, details, keyboard and returning from confirmation preserve cart and prices', () => {
  const page = loadPage(quotePath).page
  page.route = 'pages/quote/quote'
  addProduct(page, { h: 60, w: 40, meters: 100 })
  const before = state(page)
  page.onUISectionTap({ currentTarget: { dataset: { section: 'cart' } } })
  page.onToggleDimensionsHelp()
  page.onToggleQuoteDetails()
  page.onUIKeyboardChange({ detail: { height: 300 } })
  page.onUIKeyboardChange({ detail: { height: 0 } })
  let returned = false
  const result = loadPage(resultPath, { globals: { getCurrentPages: () => [page, {}] }, wx: { navigateBack() { returned = true } } }).page
  result.initData(baseline.scenarios['standard-example-logistics'].payload)
  const beforeResult = state(result, resultPath)
  result.onShow()
  result.onToggleQuoteDetails()
  result.onReturnToEdit({ currentTarget: { dataset: { target: 'delivery' } } })
  assert.equal(returned, true)
  assert.equal(page.data.uiPendingScroll, '#delivery-settings')
  page.onShow()
  assert.equal(page.data.uiPendingScroll, '')
  assert.equal(page.data.uiKeyboardHeight, 0)
  assert.deepEqual(state(page), before)
  assert.deepEqual(state(result, resultPath), beforeResult)
})
