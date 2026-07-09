const test = require('node:test')
const assert = require('node:assert/strict')

const {
  calculateForeignLine,
  recalculateForeignCart,
  formatUsdUnit,
  formatUsdAmount,
  translateTeeth,
  translateColor
} = require('../utils/foreignQuote')

test('calculates FOB USD per meter with discount and fixed box allocation', () => {
  const result = calculateForeignLine({
    rmbUnitPrice: 4.8,
    discountCoefficient: 0.88,
    boxMeters: 100,
    exchangeRate: 6.7,
    meters: 150
  })

  assert.equal(formatUsdUnit(result.fobUnitPriceUsdRaw), '0.660')
  assert.equal(formatUsdAmount(result.amountUsdRaw), '99.04')
})

test('non-full-box quantity does not change unit price', () => {
  const base = {
    rmbUnitPrice: 4.8,
    discountCoefficient: 0.88,
    boxMeters: 100,
    exchangeRate: 6.7
  }
  const partial = calculateForeignLine({ ...base, meters: 150 })
  const full = calculateForeignLine({ ...base, meters: 200 })

  assert.equal(partial.fobUnitPriceUsdRaw, full.fobUnitPriceUsdRaw)
})

test('sums raw line amounts before formatting the grand total', () => {
  const result = recalculateForeignCart([
    { id: 1, rmbUnitPrice: 4.8, boxMeters: 100, meters: 150 },
    { id: 2, rmbUnitPrice: 2.2, boxMeters: 200, meters: 75 }
  ], 0.88, 6.7)

  const expectedRaw =
    ((4.8 * 0.88 + 20 / 100) / 6.7) * 150 +
    ((2.2 * 0.88 + 20 / 200) / 6.7) * 75
  assert.equal(result.totalUsdRaw, expectedRaw)
  assert.equal(result.totalUsd, expectedRaw.toFixed(2))
  assert.equal(result.lines[0].fobUnitPriceUsd, '0.660')
})

test('rejects non-positive rate and missing box meters', () => {
  const valid = {
    rmbUnitPrice: 4.8,
    discountCoefficient: 0.88,
    boxMeters: 100,
    exchangeRate: 6.7,
    meters: 150
  }

  assert.throws(
    () => calculateForeignLine({ ...valid, exchangeRate: 0 }),
    /exchangeRate/
  )
  assert.throws(
    () => calculateForeignLine({ ...valid, boxMeters: 0 }),
    /boxMeters/
  )
})

test('uses the approved English mappings', () => {
  assert.equal(translateTeeth('粗齿'), 'Wide Slot')
  assert.equal(translateTeeth('细齿'), 'Narrow Slot')
  assert.equal(translateTeeth('封口'), 'Closed Slot')
  assert.equal(translateTeeth('全封闭'), 'Solid Wall')
  assert.equal(translateColor('灰色'), 'Grey')
  assert.throws(() => translateTeeth('未知'), /英文名称/)
  assert.throws(() => translateColor('未知'), /英文名称/)
})
