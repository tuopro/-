const test = require('node:test')
const assert = require('node:assert/strict')
const { buildForeignQuoteText } = require('../utils/foreignQuote')

test('builds a fully English FOB Ningbo customer quote', () => {
  const text = buildForeignQuoteText({
    productList: [{
      specification: '40×40',
      typeEn: 'Wide Slot',
      colorEn: 'Grey',
      fobUnitPriceUsd: '0.660',
      meters: 150,
      amountUsd: '99.04'
    }],
    foreignTotalUsd: '99.04'
  })

  for (const expected of [
    'CNDES PVC Wiring Duct - FOB Ningbo Quotation',
    'Specification',
    'Type',
    'Color',
    'Unit Price (USD/m)',
    'Quantity (m)',
    'Amount (USD)',
    '40×40',
    'Wide Slot',
    'Grey',
    '0.660',
    '150',
    '99.04',
    'FOB Ningbo Total (USD)'
  ]) {
    assert.equal(text.includes(expected), true, `missing ${expected}`)
  }
})

test('customer quote never exposes internal pricing fields', () => {
  const text = buildForeignQuoteText({
    productList: [{
      specification: '40×40',
      typeEn: 'Wide Slot',
      colorEn: 'Grey',
      fobUnitPriceUsd: '0.660',
      meters: 150,
      amountUsd: '99.04',
      exchangeRate: 6.7,
      discount: 0.88,
      rmbUnitPrice: 4.8,
      portFreight: 20
    }],
    foreignTotalUsd: '99.04',
    exchangeRate: 6.7,
    discount: 0.88
  })

  for (const forbidden of [
    '6.7',
    '0.88',
    'RMB',
    '人民币',
    '折扣',
    '20元',
    'Freight',
    'Exchange Rate'
  ]) {
    assert.equal(text.includes(forbidden), false, `leaked ${forbidden}`)
  }
})
