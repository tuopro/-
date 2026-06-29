# Fixed Length Quote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed-length quote mode for non-standard wire duct lengths while preserving the existing standard quote behavior.

**Architecture:** Reuse the existing quote page, product data, discount logic, address picker, and express freight rules. Add a quote mode switch and store cart items with a `quoteType` so the quote result page, copy text, and generated image can render standard and fixed-length items correctly.

**Tech Stack:** WeChat Mini Program WXML/WXSS/JS, local CommonJS data modules, existing canvas quote image generation.

---

### Task 1: Add Quote Mode And Fixed-Length State

**Files:**
- Modify: `pages/quote/quote.js`
- Modify: `pages/quote/quote.wxml`
- Modify: `pages/quote/quote.wxss`

- [ ] **Step 1: Add state fields**

Add these fields to `Page({ data })` in `pages/quote/quote.js`:

```js
quoteMode: 'standard',
fixedLength: '',
fixedQuantity: '',
fixedLengthHint: '',
```

- [ ] **Step 2: Add mode switch handlers**

Add:

```js
onQuoteModeTap(e) {
  const mode = e.currentTarget.dataset.mode
  if (!mode || mode === this.data.quoteMode) return
  this.setData({
    quoteMode: mode,
    sampleMeters: '',
    sampleMeterHint: '',
    fixedLength: '',
    fixedQuantity: '',
    fixedLengthHint: ''
  })
},

onFixedLengthInput(e) {
  const val = e.detail.value
  this.setData({ fixedLength: val })
  const lengthM = parseFloat(val)
  if (isNaN(lengthM) || lengthM <= 0) {
    this.setData({ fixedLengthHint: '' })
    return
  }
  if (lengthM > 2) {
    this.setData({ fixedLengthHint: '单根长度不能超过 2米' })
    return
  }
  const pieces = Math.floor(2 / lengthM)
  this.setData({ fixedLengthHint: '每根 2米线槽可切 ' + pieces + ' 根' })
},

onFixedQuantityInput(e) {
  this.setData({ fixedQuantity: e.detail.value })
}
```

- [ ] **Step 3: Add mode switch UI**

Add a segmented switch under the hero in `pages/quote/quote.wxml`:

```xml
<view class="quote-mode-tabs">
  <view class="quote-mode-tab {{quoteMode === 'standard' ? 'quote-mode-tab-active' : ''}}" data-mode="standard" bindtap="onQuoteModeTap">标准报价</view>
  <view class="quote-mode-tab {{quoteMode === 'fixed' ? 'quote-mode-tab-active' : ''}}" data-mode="fixed" bindtap="onQuoteModeTap">定长报价</view>
</view>
```

- [ ] **Step 4: Add CSS**

Add matching tab styles to `pages/quote/quote.wxss`.

### Task 2: Implement Fixed-Length Cart Items

**Files:**
- Modify: `pages/quote/quote.js`
- Modify: `pages/quote/quote.wxml`

- [ ] **Step 1: Split add-to-cart validation**

Change `addToCart()` so it routes:

```js
if (this.data.quoteMode === 'fixed') {
  this.addFixedToCart()
  return
}
```

- [ ] **Step 2: Add fixed-length calculation helper**

Add:

```js
calculateFixedQuote({ unitPrice, lengthM, quantity, boxMeters, boxWeight, boxWeightFullSeal, teeth }) {
  const cuttingRate = 1.2
  const piecesPerTwoMeter = Math.floor(2 / lengthM)
  const twoMeterCutPrice = unitPrice * 2 * cuttingRate
  const fixedUnitPrice = parseFloat((twoMeterCutPrice / piecesPerTwoMeter).toFixed(2))
  const subtotal = parseFloat((fixedUnitPrice * quantity).toFixed(2))
  const effectiveBoxWeight = teeth === '全封闭' && boxWeightFullSeal ? boxWeightFullSeal : boxWeight
  const weightPerMeter = effectiveBoxWeight / boxMeters
  const weightPerPiece = parseFloat((weightPerMeter * lengthM).toFixed(4))
  const rowWeight = parseFloat((weightPerPiece * quantity).toFixed(2))
  return { cuttingRate, piecesPerTwoMeter, twoMeterCutPrice: parseFloat(twoMeterCutPrice.toFixed(2)), fixedUnitPrice, subtotal, weightPerMeter, weightPerPiece, rowWeight }
}
```

- [ ] **Step 3: Add `addFixedToCart()`**

Validate selected spec, selected teeth, color, `lengthM > 0`, `lengthM <= 2`, and positive integer quantity. Push a cart item:

```js
{
  id: Date.now(),
  quoteType: 'fixed',
  spec,
  height,
  width,
  teeth,
  color,
  unitPrice: fixedUnitPrice,
  baseMeterPrice: samplePrice,
  fixedLength: lengthM,
  quantity,
  meters: parseFloat((lengthM * quantity).toFixed(2)),
  subtotal,
  rowWeight,
  weightPerPiece,
  pieces: quantity,
  piecesPerTwoMeter,
  twoMeterCutPrice,
  cuttingRate
}
```

- [ ] **Step 4: Render fixed input card**

In `pages/quote/quote.wxml`, show the current meter input card for `quoteMode === 'standard'`, and a fixed-length input card for `quoteMode === 'fixed'`.

### Task 3: Adapt Summary And Freight For Fixed Mode

**Files:**
- Modify: `pages/quote/quote.js`
- Modify: `pages/quote/quote.wxml`

- [ ] **Step 1: Keep `recalc()` compatible**

No new freight table is needed. `recalc()` already sums `subtotal`, `rowWeight`, and `pieces`; fixed items must supply those values.

- [ ] **Step 2: Enforce express-only in fixed mode**

When switching to fixed mode, force:

```js
transportType: 'express'
```

In the UI, hide the transport radio row when `quoteMode === 'fixed'`.

- [ ] **Step 3: Submit quote type**

Include `quoteMode` in `quoteData`, and keep all existing totals and discount values.

### Task 4: Update Quote Result Display, Copy, And Image

**Files:**
- Modify: `pages/quoteResult/quoteResult.js`
- Modify: `pages/quoteResult/quoteResult.wxml`
- Modify: `pages/quoteResult/quoteResult.wxss`

- [ ] **Step 1: Store quote mode**

Add `quoteMode` to page data and `initData()`.

- [ ] **Step 2: Render fixed rows**

For fixed rows, display:

```text
规格
单根价
长度
数量
重量
小计/折后
```

For standard rows, keep the current meter display.

- [ ] **Step 3: Hide logistics for fixed quotes**

If `quoteMode === 'fixed'`, do not show logistics cards in the result page or generated image.

- [ ] **Step 4: Update copy text**

For fixed items, copy:

```text
40×40 粗齿 灰色  ¥3.84/根 × 100根（0.6米/根） = ¥384
```

- [ ] **Step 5: Update canvas image**

Use `quoteMode` to change the title to `定长客户报价单` and row labels from `米数` to `数量`.

### Task 5: Verify Core Scenarios

**Files:**
- Verify via WeChat Mini Program tooling or static JS checks.

- [ ] **Step 1: Static syntax check**

Run:

```bash
node -c pages/quote/quote.js
node -c pages/quoteResult/quoteResult.js
```

Expected: no syntax errors.

- [ ] **Step 2: Manual calculation check**

Use 40×40 粗齿 灰色, 0.6m, 100根, 江苏省, 无折扣:

```text
单根报价 3.84
产品合计 384
总重量 25.2kg
快运费 35
含快运总价 419
```

- [ ] **Step 3: Manual discount check**

Use 9.8折:

```text
产品折后 376.32
含快运总价 411.32
```

- [ ] **Step 4: Standard quote regression check**

Add one normal standard quote item and confirm original meter-based totals, express freight, logistics freight, copy, and image still render.
