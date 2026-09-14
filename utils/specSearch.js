// Display-only specification lookup. Product selection and all pricing stay on the quote page.
const products = require('../data/products')

function searchSpecs(value, catalog = products) {
  const query = String(value || '').trim()
    .replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 0xFF10))
    .replace(/[×xX＊*]/g, 'x')
  if (!query) return []

  const pair = query.match(/^(\d+)\s*(?:x|\s)\s*(\d+)$/)
  let matches
  if (pair) {
    matches = catalog.filter(product => product.specHeight === Number(pair[1]) && product.specWidth === Number(pair[2]))
  } else if (/^\d+$/.test(query)) {
    const exact = catalog.filter(product => `${product.specHeight}${product.specWidth}` === query)
    matches = exact.length ? exact : query.length <= 3
      ? catalog.filter(product => String(product.specHeight) === query || String(product.specWidth) === query || `${product.specHeight}${product.specWidth}`.startsWith(query))
      : []
    matches = matches.slice().sort((a, b) => {
      const rank = product => String(product.specHeight) === query ? 0 : String(product.specWidth) === query ? 1 : 2
      return rank(a) - rank(b) || a.specHeight - b.specHeight || a.specWidth - b.specWidth
    })
  } else {
    matches = []
  }

  return matches.map(product => ({
    key: `${product.specHeight}x${product.specWidth}`,
    height: product.specHeight,
    width: product.specWidth,
    spec: `${product.specHeight}×${product.specWidth}`,
    dimensionLabel: `高 ${product.specHeight} × 宽 ${product.specWidth} mm`,
    teethLabel: (product.availableTeeth || []).join(' / ')
  }))
}

module.exports = { searchSpecs }
