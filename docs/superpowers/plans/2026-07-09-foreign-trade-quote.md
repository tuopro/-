# Foreign Trade FOB Quote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated foreign-trade mode that converts existing RMB meter prices into FOB Ningbo USD prices while preserving standard and fixed-length quote behavior exactly.

**Architecture:** Keep the existing quote and result pages as the UI shell, add `foreign` as a third mode, and place all new arithmetic and English presentation logic in focused CommonJS utility modules. Protect the unchanged domestic branches with direct page-level regression tests before adding foreign behavior, then test foreign calculations and customer-visible output independently.

**Tech Stack:** WeChat Mini Program JavaScript/WXML/WXSS, CommonJS modules, Node.js built-in test runner (`node --test`).

---

## File Structure

- Create `utils/foreignQuote.js`: pure FOB arithmetic, formatting, English value mapping, and foreign cart recalculation.
- Create `utils/foreignQuoteText.js`: pure customer-facing English quotation text builder that cannot access internal rate, discount, or RMB fields.
- Create `tests/helpers/loadMiniProgramPage.js`: loads a Mini Program page definition under Node with mocked `Page`, `getApp`, and synchronous `setData`.
- Create `tests/domesticQuoteRegression.test.js`: locks current standard and fixed quote calculations before production edits.
- Create `tests/foreignQuote.test.js`: verifies FOB formula, non-full-box behavior, precision, totals, and English mappings.
- Create `tests/foreignQuoteText.test.js`: verifies English output and absence of internal pricing details.
- Modify `pages/quote/quote.js`: mode switching, saved rate, foreign discount defaults, foreign cart/recalculation, validation, and result payload.
- Modify `pages/quote/quote.wxml`: third mode tab, foreign internal controls, USD table/results, and hiding domestic transport/tax sections.
- Modify `pages/quote/quote.wxss`: minimal styles for foreign controls and three-mode tabs.
- Modify `pages/quoteResult/quoteResult.js`: initialize foreign rows, copy English text, and draw a separate English image branch.
- Modify `pages/quoteResult/quoteResult.wxml`: separate English customer quote layout.
- Modify `pages/quoteResult/quoteResult.wxss`: foreign result table and total styles.

### Task 1: Lock Existing Domestic Behavior

**Files:**
- Create: `tests/helpers/loadMiniProgramPage.js`
- Create: `tests/domesticQuoteRegression.test.js`

- [ ] **Step 1: Write the page loader and domestic regression tests**

The helper must capture the object passed to `Page`, provide `getApp()`, and create a page instance whose `setData(patch, callback)` synchronously merges state.

The regression tests must cover:

```js
test('standard quote keeps current subtotal discount tax weight pieces and freight', () => {
  // 40×40, ¥4.80/m, 150m, 100m/box, 42kg/box, 9.8折, 浙江
  // subtotal 720.00, discounted 705.60, no tax 641.45
  // weight 63kg, pieces 2, express freight 44.10
  // express total 749.70, logistics freight 30.00
})

test('fixed quote keeps current cutting price and weight calculation', () => {
  // ¥4.80/m, 0.6m × 10, 100m/box, 42kg/box
  // floor(2 / 0.6) = 3, two-meter cut price 11.52
  // fixed unit price 3.84, subtotal 38.40
  // weight per meter 0.42, weight per piece 0.252, row weight 2.52
})

test('fixed quote keeps full-seal weight override', () => {
  // Same calculation with 全封闭 and boxWeightFullSeal 49.6
  // weight per meter 0.496 and row weight 2.98
})
```

- [ ] **Step 2: Run tests and verify the domestic baseline passes before edits**

Run:

```bash
node --test tests/domesticQuoteRegression.test.js
```

Expected: 3 tests pass. This is baseline characterization, so it is intentionally green before foreign production code is added.

- [ ] **Step 3: Commit the regression protection**

```bash
git add tests/helpers/loadMiniProgramPage.js tests/domesticQuoteRegression.test.js
git commit -m "test: lock domestic quote calculations"
```

### Task 2: Build the Foreign Quote Calculation Core with TDD

**Files:**
- Create: `tests/foreignQuote.test.js`
- Create: `utils/foreignQuote.js`

- [ ] **Step 1: Write failing calculation tests**

Tests must import these not-yet-created exports:

```js
const {
  calculateForeignLine,
  recalculateForeignCart,
  formatUsdUnit,
  formatUsdAmount,
  translateTeeth,
  translateColor
} = require('../utils/foreignQuote')
```

Required cases:

```js
test('calculates FOB USD per meter with discounted product and fixed per-box allocation', () => {
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
  // Compare 150m and 200m; raw unit prices must be equal.
})

test('sums raw line amounts before formatting the grand total', () => {
  // Two lines with different boxMeters; expected total calculated from raw values.
})

test('rejects non-positive rate and missing box meters', () => {
  // Assert RangeError for each invalid input.
})

test('uses the approved English mappings', () => {
  // Wide Slot, Narrow Slot, Closed Slot, Solid Wall, Grey.
})
```

- [ ] **Step 2: Run tests and verify they fail for the missing module**

Run:

```bash
node --test tests/foreignQuote.test.js
```

Expected: FAIL with `Cannot find module '../utils/foreignQuote'`.

- [ ] **Step 3: Implement the minimal pure module**

Implement:

```js
function calculateForeignLine(input) {
  const {
    rmbUnitPrice,
    discountCoefficient,
    boxMeters,
    exchangeRate,
    meters
  } = input
  if (!(exchangeRate > 0)) throw new RangeError('exchangeRate must be greater than 0')
  if (!(boxMeters > 0)) throw new RangeError('boxMeters must be greater than 0')
  if (!(meters > 0)) throw new RangeError('meters must be greater than 0')
  const discountedRmbUnitPrice = rmbUnitPrice * discountCoefficient
  const portFreightPerMeterRmb = 20 / boxMeters
  const fobUnitPriceUsdRaw =
    (discountedRmbUnitPrice + portFreightPerMeterRmb) / exchangeRate
  return {
    discountedRmbUnitPrice,
    portFreightPerMeterRmb,
    fobUnitPriceUsdRaw,
    amountUsdRaw: fobUnitPriceUsdRaw * meters
  }
}
```

Add raw cart summation, `toFixed(3)` unit formatting, `toFixed(2)` amount formatting, and exact approved mapping tables. Unknown mapping values must throw an error.

- [ ] **Step 4: Run calculation tests and verify they pass**

Run:

```bash
node --test tests/foreignQuote.test.js
```

Expected: all foreign calculation tests pass.

- [ ] **Step 5: Run domestic regression tests again**

Run:

```bash
node --test tests/domesticQuoteRegression.test.js
```

Expected: all 3 domestic regression tests still pass.

- [ ] **Step 6: Commit the calculation core**

```bash
git add utils/foreignQuote.js tests/foreignQuote.test.js
git commit -m "feat: add foreign FOB quote calculator"
```

### Task 3: Add Foreign Mode to the Quote Page

**Files:**
- Modify: `pages/quote/quote.js`
- Modify: `pages/quote/quote.wxml`
- Modify: `pages/quote/quote.wxss`
- Modify: `tests/domesticQuoteRegression.test.js`
- Create: `tests/foreignQuotePage.test.js`

- [ ] **Step 1: Write failing page behavior tests**

Cover:

```js
test('foreign mode starts with 6.7 and 8.8折 when no saved rate exists', () => {})
test('foreign rate input saves a valid value and recalculates cart', () => {})
test('foreign rate rejects zero without replacing the previous valid rate', () => {})
test('switching a non-empty cart confirms then clears and switches mode', () => {})
test('cancelling the mode switch preserves mode and cart', () => {})
test('foreign cart uses raw FOB values and formatted display values', () => {})
test('foreign submit payload excludes rate discount RMB and port freight fields', () => {})
```

The submit payload may include only customer-visible foreign row fields:

```js
{
  quoteMode: 'foreign',
  cart: [{
    id,
    specification,
    typeEn,
    colorEn,
    meters,
    fobUnitPriceUsd: '0.660',
    amountUsd: '99.04',
    amountUsdRaw
  }],
  foreignTotalUsd: '99.04'
}
```

- [ ] **Step 2: Run tests and verify they fail because foreign mode is absent**

Run:

```bash
node --test tests/foreignQuotePage.test.js
```

Expected: failures for absent foreign defaults, handlers, and payload.

- [ ] **Step 3: Implement mode state and safe switching**

Add:

```js
foreignExchangeRate: '6.7',
foreignDiscountOptions: [
  { label: '8.8折', value: 0.88 },
  { label: '无折扣', value: 1 },
  { label: '自定义折扣', value: -1 }
],
foreignDiscountTypeIndex: 0,
foreignDiscountCoefficient: 0.88,
foreignTotalUsd: '0.00'
```

Load `foreignExchangeRate` from `wx.getStorageSync('foreignExchangeRate')` only when it is a valid positive number.

Replace the current blocked switch behavior with:

```js
if (this.data.cart.length === 0) {
  this.applyQuoteMode(mode)
  return
}
wx.showModal({
  title: '切换报价模式',
  content: '切换报价模式将清空当前清单',
  confirmText: '继续切换',
  success: res => {
    if (res.confirm) this.applyQuoteMode(mode)
  }
})
```

`applyQuoteMode` must clear the cart and mode-specific entry/result state without changing domestic formulas.

- [ ] **Step 4: Implement foreign cart and recalculation as an isolated branch**

At the top of `addToCart()`:

```js
if (this.data.quoteMode === 'foreign') {
  this.addForeignToCart()
  return
}
```

At the top of `recalc()`:

```js
if (this.data.quoteMode === 'foreign') {
  this.recalcForeign()
  return
}
```

Do not edit the remaining standard/fixed arithmetic in `recalc()`.

- [ ] **Step 5: Render the foreign controls and internal results**

Add the third tab and foreign-only sections:

- Rate input with `1 USD = [input] RMB`.
- Foreign discount picker defaulting to 8.8折.
- `FOB USD/m` formatted to 3 decimals.
- `Amount (USD)` and total formatted to 2 decimals.
- Internal note `宁波港口运费：¥20/箱，按每箱米数摊入单价`.

Wrap all domestic freight, address, weight, tax, and domestic result sections so they remain unchanged for `standard` and `fixed`, and are hidden only for `foreign`.

- [ ] **Step 6: Build a sanitized foreign submit payload**

For foreign mode, validate the rate, custom discount, and mappings. Construct a new cart array containing only the customer-visible English fields and USD fields. Do not pass `exchangeRate`, `discount`, `rmbUnitPrice`, `boxMeters`, or `portFreightPerMeterRmb`.

- [ ] **Step 7: Run page and regression tests**

Run:

```bash
node --test tests/foreignQuotePage.test.js tests/domesticQuoteRegression.test.js
```

Expected: all tests pass.

- [ ] **Step 8: Commit the quote page**

```bash
git add pages/quote/quote.js pages/quote/quote.wxml pages/quote/quote.wxss tests/foreignQuotePage.test.js tests/domesticQuoteRegression.test.js
git commit -m "feat: add foreign quote mode"
```

### Task 4: Build Leak-Safe English Customer Text

**Files:**
- Create: `tests/foreignQuoteText.test.js`
- Create: `utils/foreignQuoteText.js`
- Modify: `pages/quoteResult/quoteResult.js`

- [ ] **Step 1: Write failing text builder tests**

The expected text must contain:

```text
CNDES PVC Wiring Duct – FOB Ningbo Quotation
Specification
Type
Color
Unit Price (USD/m)
Quantity (m)
Amount (USD)
FOB Ningbo Total (USD)
```

Use a row such as `40×40`, `Wide Slot`, `Grey`, `0.660`, `150`, `99.04`.

Assert the output does not contain:

```text
6.7
0.88
8.8
RMB
人民币
折扣
20元
Freight
Exchange Rate
```

- [ ] **Step 2: Run and verify failure for the missing text module**

Run:

```bash
node --test tests/foreignQuoteText.test.js
```

Expected: FAIL with missing module.

- [ ] **Step 3: Implement a whitelist-based text builder**

The builder must accept only:

```js
buildForeignQuoteText({ productList, foreignTotalUsd })
```

It must read only `specification`, `typeEn`, `colorEn`, `fobUnitPriceUsd`, `meters`, `amountUsd`, and `foreignTotalUsd`.

- [ ] **Step 4: Add the foreign branch to result initialization and copy**

In `initData`, when `quoteMode === 'foreign'`, set only the sanitized product list and total.

At the start of `onCopy()`:

```js
if (this.data.quoteMode === 'foreign') {
  const text = buildForeignQuoteText({
    productList: this.data.productList,
    foreignTotalUsd: this.data.foreignTotalUsd
  })
  wx.setClipboardData({ data: text, success: ... })
  return
}
```

Leave the existing domestic copy branch unchanged below it.

- [ ] **Step 5: Run text and domestic regression tests**

Run:

```bash
node --test tests/foreignQuoteText.test.js tests/domesticQuoteRegression.test.js
```

Expected: all tests pass.

- [ ] **Step 6: Commit the English text output**

```bash
git add utils/foreignQuoteText.js tests/foreignQuoteText.test.js pages/quoteResult/quoteResult.js
git commit -m "feat: add English foreign quote text"
```

### Task 5: Render the English Result Page and Image

**Files:**
- Modify: `pages/quoteResult/quoteResult.js`
- Modify: `pages/quoteResult/quoteResult.wxml`
- Modify: `pages/quoteResult/quoteResult.wxss`
- Create: `tests/foreignQuoteResult.test.js`

- [ ] **Step 1: Write failing result-page branch tests**

Verify:

```js
test('foreign init uses sanitized rows and total without domestic fields', () => {})
test('foreign canvas height uses a compact English-only layout', () => {})
test('foreign image generation dispatches to drawForeignQuote', () => {})
test('domestic image generation still dispatches to drawQuote', () => {})
```

- [ ] **Step 2: Run tests and verify foreign result branches are missing**

Run:

```bash
node --test tests/foreignQuoteResult.test.js
```

Expected: failures for missing foreign rendering behavior.

- [ ] **Step 3: Add a separate foreign WXML layout**

When `quoteMode === 'foreign'`, render:

- `CNDES PVC Wiring Duct`
- `FOB Ningbo Quotation`
- Product columns: Specification, Type, Color, USD/m, Quantity, Amount
- `FOB Ningbo Total (USD)`
- Copy and image buttons

Keep the current domestic WXML inside the non-foreign branch without changing its values or labels.

- [ ] **Step 4: Add a separate foreign canvas function**

Implement `drawForeignQuote(ctx, data, canvasH)` using only sanitized customer fields. It must draw the English title, rows, total, brand line, and date. It must not call or reuse the domestic summary/freight drawing block.

Dispatch:

```js
if (d.quoteMode === 'foreign') {
  this.drawForeignQuote(ctx, d, canvasH)
} else {
  this.drawQuote(ctx, d, canvasH)
}
```

- [ ] **Step 5: Add scoped foreign result styles**

Use `.foreign-*` class names so current domestic selectors and layout remain untouched.

- [ ] **Step 6: Run all automated tests**

Run:

```bash
node --test tests/*.test.js
```

Expected: all tests pass with zero failures.

- [ ] **Step 7: Commit the result page**

```bash
git add pages/quoteResult/quoteResult.js pages/quoteResult/quoteResult.wxml pages/quoteResult/quoteResult.wxss tests/foreignQuoteResult.test.js
git commit -m "feat: render English FOB quotation"
```

### Task 6: Final Regression and Manual Mini Program Verification

**Files:**
- Modify only if a verification failure exposes a defect.

- [ ] **Step 1: Run syntax checks**

Run:

```bash
node --check pages/quote/quote.js
node --check pages/quoteResult/quoteResult.js
node --check utils/foreignQuote.js
node --check utils/foreignQuoteText.js
```

Expected: all commands exit 0.

- [ ] **Step 2: Run the complete automated suite**

Run:

```bash
node --test tests/*.test.js
```

Expected: zero failures.

- [ ] **Step 3: Inspect the exact diff for domestic changes**

Run:

```bash
git diff HEAD~4 -- pages/quote/quote.js pages/quote/quote.wxml pages/quoteResult/quoteResult.js pages/quoteResult/quoteResult.wxml
```

Verify that domestic formulas in `calculateFixedQuote()` and the existing non-foreign body of `recalc()` are byte-for-byte unchanged, aside from isolated foreign dispatch guards and non-foreign WXML wrappers.

- [ ] **Step 4: Verify in WeChat Developer Tools**

Check these flows:

1. Standard quote: 40×40, 150m, 9.8折, 浙江; compare all current totals with the regression fixture.
2. Fixed quote: 40×40, 0.6m × 10; compare unit price, subtotal, and weight.
3. Foreign quote: 40×40 Wide Slot Grey, 150m, 8.8折, rate 6.7; expect `$0.660/m` and `$99.04`.
4. Change foreign quantity to 200m; expect the same `$0.660/m`.
5. Change rate, return to the page, and confirm the saved rate is restored.
6. Switch modes with a non-empty list; cancel preserves data, confirm clears and switches.
7. Copy and image output are fully English and contain no exchange rate, discount, RMB price, or ¥20 freight.

- [ ] **Step 5: Run final status and diff checks**

Run:

```bash
git status --short
git diff --check
```

Expected: no whitespace errors; pre-existing unrelated untracked files remain untouched.
