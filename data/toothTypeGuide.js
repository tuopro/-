// UI-only tooth type explanations. Product availability still comes from products.js.
const TOOTH_TYPE_ORDER = ['粗齿', '细齿', '封口', '全封闭']

const TOOTH_TYPE_GUIDES = {
  粗齿: {
    image: '/assets/tooth-types/coarse.png',
    description: '出线孔较大，适合较粗线缆出线。',
    rules: [
      { min: 20, max: 30, outletWidth: 4, toothWidth: 6 },
      { min: 35, max: 65, outletWidth: 6, toothWidth: 8 },
      { min: 80, max: 80, outletWidth: 8, toothWidth: 10 },
      { min: 100, max: 100, outletWidth: 10, toothWidth: 12 }
    ]
  },
  细齿: {
    image: '/assets/tooth-types/fine.png',
    description: '齿距更密，适合较细线缆或需要更多出线位置。',
    fixedParameters: { outletWidth: 4, toothWidth: 6 }
  },
  封口: {
    image: '/assets/tooth-types/closed-slot.png',
    description: '侧面开孔数量更少、开口更大。',
    rules: [
      { min: 30, max: 40, outletWidth: 6, toothWidth: 6 },
      { min: 50, max: 65, outletWidth: 8, toothWidth: 10 },
      { min: 80, max: 100, outletWidth: 10, toothWidth: 12 }
    ]
  },
  全封闭: {
    image: '/assets/tooth-types/solid.png',
    description: '侧面无出线孔，提供更完整的线缆包覆与防护。',
    noOpenings: true
  }
}

function getParameters(definition, height) {
  if (definition.fixedParameters) return definition.fixedParameters
  return (definition.rules || []).find(rule => height >= rule.min && height <= rule.max) || null
}

function getToothGuide(type, height) {
  const definition = TOOTH_TYPE_GUIDES[type]
  if (!definition) {
    return {
      type,
      image: '',
      description: '详细齿型说明请咨询业务人员。',
      showParameters: false,
      parameterMissing: false,
      parameterText: ''
    }
  }

  const guide = {
    type,
    image: definition.image,
    description: definition.description,
    showParameters: false,
    parameterMissing: false,
    parameterText: ''
  }
  if (definition.noOpenings || !Number.isFinite(Number(height)) || Number(height) <= 0) return guide

  const parameters = getParameters(definition, Number(height))
  if (!parameters) {
    console.warn(`[toothTypeGuide] 缺少 ${type} 高度 ${height} mm 的孔位说明参数`)
    guide.parameterMissing = true
    guide.parameterText = '详细孔位参数请咨询业务人员'
    return guide
  }

  guide.showParameters = true
  guide.outletWidth = parameters.outletWidth
  guide.toothWidth = parameters.toothWidth
  guide.parameterText = `出线孔 ${parameters.outletWidth} mm · 齿宽 ${parameters.toothWidth} mm`
  return guide
}

function getToothGuides(types, height) {
  return types.map(type => getToothGuide(type, height))
}

function getAllToothTypes() {
  return TOOTH_TYPE_ORDER.slice()
}

module.exports = { getToothGuide, getToothGuides, getAllToothTypes }
