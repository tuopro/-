const test = require('node:test')
const assert = require('node:assert/strict')
const { loadMiniProgramPage } = require('./helpers/loadMiniProgramPage')

test('foreign mode starts with 6.7 and 8.8折', () => {
  const page = loadMiniProgramPage('pages/quote/quote.js')
  assert.equal(page.data.foreignExchangeRate, '6.7')
  assert.equal(page.data.foreignDiscountCoefficient, 0.88)
  assert.equal(page.data.foreignDiscountOptions[0].label, '8.8折')
})

test('valid foreign rate is saved and recalculates cart', () => {
  let saved = null
  const page = loadMiniProgramPage('pages/quote/quote.js', {
    setStorageSync(key, value) { saved = [key, value] }
  })
  page.data.quoteMode = 'foreign'
  page.data.cart = [{
    id: 1,
    rmbUnitPrice: 4.8,
    boxMeters: 100,
    meters: 150
  }]

  page.onForeignExchangeRateBlur({ detail: { value: '7.1' } })

  assert.equal(page.data.foreignExchangeRate, '7.1')
  assert.deepEqual(saved, ['foreignExchangeRate', '7.1'])
  assert.equal(page.data.cart[0].fobUnitPriceUsd, '0.623')
})

test('invalid foreign rate keeps the previous valid rate', () => {
  let toast = ''
  const page = loadMiniProgramPage('pages/quote/quote.js', {
    showToast(options) { toast = options.title }
  })
  page.data.foreignExchangeRate = '6.7'

  page.onForeignExchangeRateBlur({ detail: { value: '0' } })

  assert.equal(page.data.foreignExchangeRate, '6.7')
  assert.equal(toast, '请输入正确汇率')
})

test('confirmed mode switch clears cart and switches mode', () => {
  const page = loadMiniProgramPage('pages/quote/quote.js', {
    showModal(options) { options.success({ confirm: true, cancel: false }) }
  })
  page.data.quoteMode = 'standard'
  page.data.cart = [{ id: 1 }]

  page.onQuoteModeTap({ currentTarget: { dataset: { mode: 'foreign' } } })

  assert.equal(page.data.quoteMode, 'foreign')
  assert.deepEqual(page.data.cart, [])
})

test('cancelled mode switch preserves cart and mode', () => {
  const page = loadMiniProgramPage('pages/quote/quote.js', {
    showModal(options) { options.success({ confirm: false, cancel: true }) }
  })
  const cart = [{ id: 1 }]
  page.data.quoteMode = 'standard'
  page.data.cart = cart

  page.onQuoteModeTap({ currentTarget: { dataset: { mode: 'foreign' } } })

  assert.equal(page.data.quoteMode, 'standard')
  assert.equal(page.data.cart, cart)
})

test('foreign cart stores raw and formatted USD values', () => {
  const page = loadMiniProgramPage('pages/quote/quote.js')
  page.data.quoteMode = 'foreign'
  page.data.selectedHeight = 40
  page.data.selectedWidth = 40
  page.data.selectedTeeth = '粗齿'
  page.data.selectedColor = '灰色'
  page.data.sampleSpec = '40×40'
  page.data.samplePrice = 4.8
  page.data.sampleMeters = '150'
  page.data.sampleBoxMeters = 100

  page.addForeignToCart()

  assert.equal(page.data.cart.length, 1)
  assert.equal(page.data.cart[0].typeEn, 'Wide Slot')
  assert.equal(page.data.cart[0].colorEn, 'Grey')
  assert.equal(page.data.cart[0].fobUnitPriceUsd, '0.660')
  assert.equal(page.data.cart[0].amountUsd, '99.04')
  assert.equal(page.data.foreignTotalUsd, '99.04')
})

test('foreign submit payload excludes internal pricing inputs', () => {
  let payload = null
  const page = loadMiniProgramPage('pages/quote/quote.js', {
    navigateTo(options) {
      options.success({
        eventChannel: {
          emit(name, value) { payload = value }
        }
      })
    }
  })
  page.data.quoteMode = 'foreign'
  page.data.cart = [{
    id: 1,
    specification: '40×40',
    typeEn: 'Wide Slot',
    colorEn: 'Grey',
    meters: 150,
    rmbUnitPrice: 4.8,
    boxMeters: 100,
    fobUnitPriceUsd: '0.660',
    amountUsd: '99.04',
    amountUsdRaw: 99.0447761194
  }]
  page.data.foreignTotalUsd = '99.04'

  page.onSubmit()

  assert.equal(payload.quoteMode, 'foreign')
  assert.equal(payload.foreignTotalUsd, '99.04')
  assert.deepEqual(Object.keys(payload.cart[0]).sort(), [
    'amountUsd',
    'amountUsdRaw',
    'colorEn',
    'fobUnitPriceUsd',
    'id',
    'meters',
    'specification',
    'typeEn'
  ])
  assert.equal(JSON.stringify(payload).includes('6.7'), false)
  assert.equal(JSON.stringify(payload).includes('0.88'), false)
  assert.equal(JSON.stringify(payload).includes('rmbUnitPrice'), false)
  assert.equal(JSON.stringify(payload).includes('boxMeters'), false)
})
