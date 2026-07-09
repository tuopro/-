const test = require('node:test')
const assert = require('node:assert/strict')
const { loadMiniProgramPage } = require('./helpers/loadMiniProgramPage')

test('standard quote keeps current subtotal discount tax weight pieces and freight', () => {
  const page = loadMiniProgramPage('pages/quote/quote.js')
  page.data.cart = [{
    subtotal: 720,
    rowWeight: 63,
    pieces: 2
  }]
  page.data.includeFreight = true
  page.data.province = '浙江省'
  page.data.discountCoefficient = 0.98

  page.recalc()

  assert.equal(page.data.productTotal, 720)
  assert.equal(page.data.discountedTotal, 705.6)
  assert.equal(page.data.noTaxTotal, 641.45)
  assert.equal(page.data.totalWeight, 63)
  assert.equal(page.data.totalPieces, 2)
  assert.equal(page.data.expressFreight, 44.1)
  assert.equal(page.data.expressTotal, 749.7)
  assert.equal(page.data.logisticsFreight, 30)
  assert.equal(page.data.logisticsTotal, 735.6)
})

test('fixed quote keeps current cutting price and weight calculation', () => {
  const page = loadMiniProgramPage('pages/quote/quote.js')

  const result = page.calculateFixedQuote({
    unitPrice: 4.8,
    lengthM: 0.6,
    quantity: 10,
    boxMeters: 100,
    boxWeight: 42,
    boxWeightFullSeal: 49.6,
    teeth: '细齿'
  })

  assert.deepEqual(result, {
    cuttingRate: 1.2,
    piecesPerTwoMeter: 3,
    twoMeterCutPrice: 11.52,
    fixedUnitPrice: 3.84,
    subtotal: 38.4,
    weightPerMeter: 0.42,
    weightPerPiece: 0.252,
    rowWeight: 2.52
  })
})

test('fixed quote keeps full-seal weight override', () => {
  const page = loadMiniProgramPage('pages/quote/quote.js')

  const result = page.calculateFixedQuote({
    unitPrice: 4.8,
    lengthM: 0.6,
    quantity: 10,
    boxMeters: 100,
    boxWeight: 42,
    boxWeightFullSeal: 49.6,
    teeth: '全封闭'
  })

  assert.equal(result.weightPerMeter, 0.496)
  assert.equal(result.weightPerPiece, 0.2976)
  assert.equal(result.rowWeight, 2.98)
})
