const test = require('node:test')
const assert = require('node:assert/strict')
const { loadMiniProgramPage } = require('./helpers/loadMiniProgramPage')

const foreignData = {
  quoteMode: 'foreign',
  cart: [{
    id: 1,
    specification: '40×40',
    typeEn: 'Wide Slot',
    colorEn: 'Grey',
    fobUnitPriceUsd: '0.660',
    meters: 150,
    amountUsd: '99.04',
    amountUsdRaw: 99.0447761194
  }],
  foreignTotalUsd: '99.04'
}

test('foreign init keeps the sanitized rows and USD total', () => {
  const page = loadMiniProgramPage('pages/quoteResult/quoteResult.js')
  page.initData(foreignData)

  assert.equal(page.data.quoteMode, 'foreign')
  assert.equal(page.data.foreignTotalUsd, '99.04')
  assert.deepEqual(page.data.productList, foreignData.cart)
  assert.equal('discount' in page.data.productList[0], false)
})

test('foreign copy uses the English leak-safe builder', () => {
  let copied = ''
  const page = loadMiniProgramPage('pages/quoteResult/quoteResult.js', {
    setClipboardData(options) {
      copied = options.data
      if (options.success) options.success()
    },
    showToast() {}
  })
  page.initData(foreignData)

  page.onCopy()

  assert.equal(copied.includes('FOB Ningbo Quotation'), true)
  assert.equal(copied.includes('汇率'), false)
  assert.equal(copied.includes('折扣'), false)
  assert.equal(copied.includes('¥'), false)
})

test('foreign canvas uses a compact customer-only height', () => {
  const page = loadMiniProgramPage('pages/quoteResult/quoteResult.js')
  const foreignHeight = page.calcCanvasHeight(2, 'foreign')
  const domesticHeight = page.calcCanvasHeight(2, 'standard')

  assert.equal(foreignHeight < domesticHeight, true)
})

test('foreign drawing dispatches to the English canvas branch', () => {
  const page = loadMiniProgramPage('pages/quoteResult/quoteResult.js')
  let foreignCalls = 0
  let domesticCalls = 0
  page.drawForeignQuote = () => { foreignCalls += 1 }
  page.drawQuote = () => { domesticCalls += 1 }

  page.drawQuoteByMode({}, { quoteMode: 'foreign' }, 600)
  page.drawQuoteByMode({}, { quoteMode: 'standard' }, 600)

  assert.equal(foreignCalls, 1)
  assert.equal(domesticCalls, 1)
})
