const test = require('node:test')
const assert = require('node:assert/strict')
const products = require('../data/products')
const { searchSpecs } = require('../utils/specSearch')
const { loadPage, quotePath, baselineCommit, clone, addProduct } = require('./helpers/uiRegressionHarness')

const originalKeys = Object.keys(loadPage(quotePath, { revision: baselineCommit }).page.data)
const businessState = page => clone(Object.fromEntries(originalKeys.map(key => [key, page.data[key]])))
const tap = value => ({ currentTarget: { dataset: { value } } })

test('search accepts five agreed formats and preserves height/width orientation', () => {
  for (const query of ['6040', '60×40', '60x40', '60*40', '60 40', ' 60 X 40 ', '６０＊４０']) {
    const rows = searchSpecs(query)
    assert.equal(rows.length, 1, query)
    assert.equal(rows[0].dimensionLabel, '高 60 × 宽 40 mm')
  }
  assert.equal(searchSpecs('4060')[0].dimensionLabel, '高 40 × 宽 60 mm')
  assert.notDeepEqual(searchSpecs('6040'), searchSpecs('4060'))
})

test('long specifications are looked up from catalog and missing full specs never choose a neighbor', () => {
  assert.equal(searchSpecs('100100')[0].spec, '100×100')
  assert.equal(searchSpecs('100120')[0].spec, '100×120')
  for (const query of ['', '9999', '60x41', '6041', '60x', 'foo', '60-40']) assert.deepEqual(searchSpecs(query), [], query)
  assert.equal(searchSpecs('40')[0].height, 40)
  assert.ok(searchSpecs('40').every(row => row.height === 40 || row.width === 40))
})

test('search never mutates catalog or returns prices and retains ambiguous candidates', () => {
  const before = clone(products)
  products.forEach(product => searchSpecs(`${product.specHeight}${product.specWidth}`))
  assert.deepEqual(products, before)
  assert.deepEqual(Object.keys(searchSpecs('6040')[0]).sort(), ['key', 'height', 'width', 'spec', 'dimensionLabel', 'teethLabel'].sort())
  const ambiguous = [{ specHeight: 1, specWidth: 234 }, { specHeight: 12, specWidth: 34 }]
  assert.equal(searchSpecs('1234', ambiguous).length, 2)
  assert.equal(searchSpecs('12x34', ambiguous)[0].height, 12)
})

for (const mode of ['standard', 'fixed', 'foreign']) {
  test(`${mode}: search selection and pricing match original manual flow for all 66 specifications`, () => {
    assert.equal(products.length, 66)
    for (const product of products) {
      const current = loadPage(quotePath).page
      const original = loadPage(quotePath, { revision: baselineCommit }).page
      for (const page of [current, original]) {
        page.applyQuoteMode(mode)
        addProduct(page, { h: 40, w: 40, meters: 100, length: 0.6, quantity: 10 })
      }
      const beforeSearch = businessState(current)
      current.onSpecSearchInput({ detail: { value: `${product.specHeight}${product.specWidth}` } })
      assert.deepEqual(businessState(current), beforeSearch, 'typing does not select or change cart')
      current.onSpecSearchSelect({ currentTarget: { dataset: { height: product.specHeight, width: product.specWidth } } })
      original.onHeightTap(tap(product.specHeight))
      original.onWidthTap(tap(product.specWidth))
      assert.deepEqual(businessState(current), businessState(original), `selection ${product.specHeight}x${product.specWidth}`)
      for (const page of [current, original]) {
        page.onTeethTap(tap(product.availableTeeth[0]))
        page.onColorTap(tap(product.availableColors[0]))
        if (mode === 'fixed') {
          page.onFixedLengthInput({ detail: { value: '0.7' } })
          page.onFixedQuantityInput({ detail: { value: '101' } })
        } else page.onMetersInput({ detail: { value: '151.5' } })
        page.addToCart()
        page.onRegionChange({ detail: { value: ['浙江省', '杭州市', ''] } })
      }
      assert.deepEqual(businessState(current), businessState(original), `pricing ${product.specHeight}x${product.specWidth}`)
    }
  })
}

test('clearing/cancelling search and an invalid result preserve the original business state', () => {
  const page = loadPage(quotePath).page
  addProduct(page, { h: 60, w: 40, meters: 100 })
  const before = businessState(page)
  page.onSpecSearchInput({ detail: { value: '6040' } })
  page.onSpecSearchSelect({ currentTarget: { dataset: { height: 40, width: 60 } } })
  page.onSpecSearchClear()
  page.onSpecSearchCancel()
  page.onShowManualSpecs()
  assert.deepEqual(businessState(page), before)
})
