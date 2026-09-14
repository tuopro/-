const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { getToothGuide, getToothGuides, getAllToothTypes } = require('../data/toothTypeGuide')
const { root, baselineCommit, quotePath, clone, loadPage } = require('./helpers/uiRegressionHarness')

function selectSpec(page, height, width) {
  page.onHeightTap({ currentTarget: { dataset: { value: height } } })
  page.onWidthTap({ currentTarget: { dataset: { value: width } } })
}

function businessState(page) {
  const keys = Object.keys(loadPage(quotePath, { revision: baselineCommit }).page.data)
  return clone(Object.fromEntries(keys.map(key => [key, page.data[key]])))
}

test('coarse tooth parameters follow exact height ranges', () => {
  const cases = [
    [40, 6, 8],
    [60, 6, 8],
    [80, 8, 10],
    [100, 10, 12]
  ]
  for (const [height, outletWidth, toothWidth] of cases) {
    const guide = getToothGuide('粗齿', height)
    assert.equal(guide.outletWidth, outletWidth, `height ${height} outlet`)
    assert.equal(guide.toothWidth, toothWidth, `height ${height} tooth`)
    assert.equal(guide.parameterText, `出线孔 ${outletWidth} mm · 齿宽 ${toothWidth} mm`)
  }
})

test('fine tooth parameters stay 4 mm by 6 mm at every selected height', () => {
  for (const height of [20, 35, 60, 80, 100]) {
    const guide = getToothGuide('细齿', height)
    assert.equal(guide.outletWidth, 4)
    assert.equal(guide.toothWidth, 6)
  }
})

test('missing closed-slot height is reported without borrowing a nearby range', () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = message => warnings.push(message)
  try {
    const guide = getToothGuide('封口', 45)
    assert.equal(guide.showParameters, false)
    assert.equal(guide.parameterMissing, true)
    assert.equal(guide.parameterText, '详细孔位参数请咨询业务人员')
    assert.equal(warnings.length, 1)
  } finally {
    console.warn = originalWarn
  }
})

test('solid guide never invents Q or P parameters', () => {
  const guide = getToothGuide('全封闭', 60)
  assert.equal(guide.showParameters, false)
  assert.equal(guide.parameterMissing, false)
  assert.equal('outletWidth' in guide, false)
  assert.equal('toothWidth' in guide, false)
})

test('guide images exist and the UI preserves their aspect ratio', () => {
  for (const guide of getToothGuides(getAllToothTypes(), null)) {
    const imagePath = path.join(root, guide.image.slice(1))
    const image = fs.readFileSync(imagePath)
    assert.equal(image.readUInt32BE(16), 220, guide.type)
    assert.equal(image.readUInt32BE(20), 166, guide.type)
  }
  const wxml = fs.readFileSync(path.join(root, 'pages/quote/quote.wxml'), 'utf8')
  assert.match(wxml, /class="tooth-guide-image"[^>]+mode="widthFix"/)
})

test('without a selected specification the sheet shows all guides and no parameters', () => {
  const page = loadPage(quotePath).page
  page.onOpenToothGuide()
  assert.equal(page.data.uiToothGuideOpen, true)
  assert.equal(page.data.uiToothGuideHasSpec, false)
  assert.deepEqual(page.data.uiToothGuides.map(item => item.type), ['粗齿', '细齿', '封口', '全封闭'])
  assert.equal(page.data.uiToothGuides.some(item => item.showParameters || item.parameterMissing), false)
})

test('selected product availability comes only from products.js', () => {
  const page = loadPage(quotePath).page
  selectSpec(page, 20, 15)
  page.onOpenToothGuide()
  assert.deepEqual(page.data.uiToothGuides.map(item => item.type), ['细齿', '全封闭'])
  assert.equal(page.data.uiToothGuides.some(item => item.type === '粗齿'), false)
  assert.equal(page.data.uiToothGuideSpec, '高 20 × 宽 15 mm')
})

test('opening and closing the guide preserves specification, quantity, cart and prices', () => {
  const page = loadPage(quotePath).page
  selectSpec(page, 60, 40)
  page.onTeethTap({ currentTarget: { dataset: { value: '粗齿' } } })
  page.onMetersInput({ detail: { value: '100' } })
  page.addToCart()

  selectSpec(page, 40, 40)
  page.onTeethTap({ currentTarget: { dataset: { value: '粗齿' } } })
  page.onMetersInput({ detail: { value: '100' } })
  const before = businessState(page)

  page.onOpenToothGuide()
  const guides = Object.fromEntries(page.data.uiToothGuides.map(item => [item.type, item]))
  assert.equal(guides['粗齿'].parameterText, '出线孔 6 mm · 齿宽 8 mm')
  assert.deepEqual(page.data.uiToothGuides.map(item => item.type), ['粗齿', '细齿', '封口', '全封闭'])
  page.onCloseToothGuide()

  assert.equal(page.data.uiToothGuideOpen, false)
  assert.deepEqual(businessState(page), before)
})
