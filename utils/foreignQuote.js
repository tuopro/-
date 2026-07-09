const PORT_FREIGHT_PER_BOX_RMB = 20

const TEETH_EN = {
  '粗齿': 'Wide Slot',
  '细齿': 'Narrow Slot',
  '封口': 'Closed Slot',
  '全封闭': 'Solid Wall'
}

const COLOR_EN = {
  '灰色': 'Grey'
}

function requirePositiveNumber(value, name) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) {
    throw new RangeError(`${name} must be greater than 0`)
  }
  return number
}

function calculateForeignLine(input) {
  const rmbUnitPrice = requirePositiveNumber(input.rmbUnitPrice, 'rmbUnitPrice')
  const discountCoefficient = requirePositiveNumber(
    input.discountCoefficient,
    'discountCoefficient'
  )
  const boxMeters = requirePositiveNumber(input.boxMeters, 'boxMeters')
  const exchangeRate = requirePositiveNumber(input.exchangeRate, 'exchangeRate')
  const meters = requirePositiveNumber(input.meters, 'meters')
  const discountedRmbUnitPrice = rmbUnitPrice * discountCoefficient
  const portFreightPerMeterRmb = PORT_FREIGHT_PER_BOX_RMB / boxMeters
  const fobUnitPriceUsdRaw =
    (discountedRmbUnitPrice + portFreightPerMeterRmb) / exchangeRate

  return {
    discountedRmbUnitPrice,
    portFreightPerMeterRmb,
    fobUnitPriceUsdRaw,
    amountUsdRaw: fobUnitPriceUsdRaw * meters
  }
}

function formatUsdUnit(value) {
  return Number(value).toFixed(3)
}

function formatUsdAmount(value) {
  return Number(value).toFixed(2)
}

function recalculateForeignCart(cart, discountCoefficient, exchangeRate) {
  const lines = cart.map(item => {
    const calculated = calculateForeignLine({
      rmbUnitPrice: item.rmbUnitPrice,
      discountCoefficient,
      boxMeters: item.boxMeters,
      exchangeRate,
      meters: item.meters
    })
    return {
      ...item,
      ...calculated,
      fobUnitPriceUsd: formatUsdUnit(calculated.fobUnitPriceUsdRaw),
      amountUsd: formatUsdAmount(calculated.amountUsdRaw)
    }
  })
  const totalUsdRaw = lines.reduce((sum, item) => sum + item.amountUsdRaw, 0)

  return {
    lines,
    totalUsdRaw,
    totalUsd: formatUsdAmount(totalUsdRaw)
  }
}

function translateValue(map, value) {
  const translated = map[value]
  if (!translated) throw new Error(`${value || '该选项'}缺少英文名称`)
  return translated
}

function translateTeeth(value) {
  return translateValue(TEETH_EN, value)
}

function translateColor(value) {
  return translateValue(COLOR_EN, value)
}

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

module.exports = {
  PORT_FREIGHT_PER_BOX_RMB,
  calculateForeignLine,
  recalculateForeignCart,
  formatUsdUnit,
  formatUsdAmount,
  translateTeeth,
  translateColor,
  buildForeignQuoteText
}
