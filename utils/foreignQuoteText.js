function buildForeignQuoteText({ productList, foreignTotalUsd }) {
  const header = [
    'CNDES PVC Wiring Duct - FOB Ningbo Quotation',
    '',
    'Specification | Type | Color | Unit Price (USD/m) | Quantity (m) | Amount (USD)'
  ]
  const rows = productList.map(item => [
    item.specification,
    item.typeEn,
    item.colorEn,
    item.fobUnitPriceUsd,
    item.meters,
    item.amountUsd
  ].join(' | '))

  return [
    ...header,
    ...rows,
    '',
    `FOB Ningbo Total (USD): ${foreignTotalUsd}`,
    '',
    'CNDES PVC Wiring Duct'
  ].join('\n')
}

module.exports = { buildForeignQuoteText }
