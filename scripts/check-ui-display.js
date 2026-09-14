const assert = require('node:assert/strict')
const vm = require('node:vm')
const products = require('../data/products')
const baseline = require('../docs/ui-proposals/2026-09-12/ui-baseline.json')
const { loadPage, quotePath, resultPath } = require('../tests/helpers/uiRegressionHarness')

// Evaluate real WeChat compiler output to verify visible text, branches and event wiring.
// This is template validation; it does not replace simulator/device layout checks.
function checkDisplay(compiledWxml) {
  const context = { window: {}, console }
  vm.runInNewContext(compiledWxml, context)
  const renderQuote = context.$gwx('pages/quote/quote.wxml')
  const renderResult = context.$gwx('pages/quoteResult/quoteResult.wxml')
  const nodes = (node, predicate) => !node || typeof node !== 'object' || node.attr?.hidden
    ? [] : [...(predicate(node) ? [node] : []), ...(node.children || []).flatMap(child => nodes(child, predicate))]
  const byClass = (tree, name) => nodes(tree, node => (node.attr?.class || '').split(' ').includes(name))
  const text = node => typeof node === 'string' ? node : (node.children || []).map(text).join(' ')
  const page = loadPage(quotePath, { wx: { cloud: {
    callFunction: async () => ({ result: { openid: 'test' } }),
    database: () => ({ collection: () => ({ where: () => ({ get: async () => ({ data: [] }) }) }) })
  } } }).page
  page.onLoad()
  let tree = renderQuote(page.data)
  assert.equal(nodes(tree, node => node.attr?.bindtap === 'onHeightTap').length, new Set(products.map(product => product.specHeight)).size)
  assert.equal(nodes(tree, node => node.attr?.bindtap === 'onWidthTap').length, page.data.widthList.length)

  for (const value of ['6040', '60×40', '60x40', '60*40', '60 40']) {
    page.onSpecSearchInput({ detail: { value } })
    tree = renderQuote(page.data)
    const results = byClass(tree, 'search-result')
    assert.equal(results.length, 1)
    assert.ok(text(results[0]).includes('高 60 × 宽 40 mm'))
    assert.equal(results[0].attr.bindtap, 'onSpecSearchSelect')
    assert.equal(Number(results[0].attr['data-height']), 60)
    assert.equal(Number(results[0].attr['data-width']), 40)
    assert.equal(byClass(tree, 'bottom-dock').length, 0)
  }
  page.onSpecSearchInput({ detail: { value: '6041' } })
  tree = renderQuote(page.data)
  assert.ok(nodes(tree, node => node.tag === 'wx-text').some(node => text(node) === '未找到该规格'))
  assert.equal(nodes(tree, node => node.attr?.bindtap === 'onShowManualSpecs').length, 1)
  page.onSpecSearchInput({ detail: { value: '6040' } })
  page.onSpecSearchSelect({ currentTarget: { dataset: { height: 60, width: 40 } } })
  tree = renderQuote(page.data)
  assert.ok(text(byClass(tree, 'selected-spec')[0]).includes('高 60 × 宽 40 mm'))
  assert.equal(nodes(tree, node => node.attr?.bindtap === 'onTeethTap').length, page.data.sampleTeeth.length)
  page.onShowManualSpecs()
  assert.equal(nodes(renderQuote(page.data), node => node.attr?.bindtap === 'onHeightTap').length, page.data.heightList.length)

  for (const [name, snapshot] of Object.entries(baseline.scenarios)) {
    const quote = loadPage(quotePath).page
    quote.setData({ ...snapshot.state, uiSection: 'cart', uiDetailsOpen: true })
    quote.route = 'pages/quote/quote'
    tree = renderQuote(quote.data)
    assert.equal(byClass(tree, 'cart-item').length, snapshot.state.cart.length, name)
    const result = loadPage(resultPath, { globals: { getCurrentPages: () => [quote, {}] } }).page
    result.initData(snapshot.payload)
    result.onShow()
    result.onToggleQuoteDetails()
    const resultTree = renderResult(result.data)
    const data = snapshot.state
    let expected
    if (data.quoteMode === 'foreign') {
      expected = '$' + data.foreignTotalUsd
      assert.equal(nodes(resultTree, node => node.tag === 'wx-text').some(node => /[¥人民币汇率折扣]/.test(text(node))), false, name)
    } else {
      const logistics = data.transportType === 'logistics'
      const configured = logistics ? data.logisticsRule : data.freightRule
      expected = '¥' + (data.includeFreight && configured ? (logistics ? data.logisticsTotal : data.expressTotal) : data.discountedTotal)
      if (data.quoteMode === 'fixed') assert.equal(nodes(tree, node => node.attr?.['data-value'] === 'logistics').length, 0)
    }
    assert.equal(text(byClass(resultTree, 'total-value')[0]), expected, name)
    if (byClass(tree, 'dock-total').length) assert.equal(text(byClass(tree, 'dock-total')[0]), expected, name)
    assert.equal(nodes(resultTree, node => node.attr?.bindtap === 'onGenerateImage').length, 1)
    assert.equal(nodes(resultTree, node => node.attr?.bindtap === 'onCopy').length, 1)
  }
  console.log('PASS: native compiled WXML display branches, manual/search controls, all 17 quote totals, FOB output and export bindings')
}

module.exports = { checkDisplay }
