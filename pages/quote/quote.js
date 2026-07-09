const app = getApp()
const products = require('../../data/products')
const freightRules = require('../../data/freightRules')
const logisticsRules = require('../../data/logisticsRules')
const {
  recalculateForeignCart,
  translateTeeth,
  translateColor
} = require('../../utils/foreignQuote')

Page({
  data: {
    sampleTeeth: [],
    sampleColors: [],
    sampleSpec: '',
    samplePrice: 0,
    sampleBoxMeters: 0,
    sampleBoxWeight: 0,
    sampleBoxWeightFullSeal: null,
    sampleBasePrice: 0,
    sampleMeters: '',
    sampleMeterHint: '',
    quoteMode: 'standard',
    fixedLength: '',
    fixedQuantity: '',
    fixedLengthHint: '',
    foreignExchangeRate: '6.7',
    foreignDiscountOptions: [
      { label: '8.8折', value: 0.88 },
      { label: '无折扣', value: 1 },
      { label: '自定义折扣', value: -1 }
    ],
    foreignDiscountTypeIndex: 0,
    foreignDiscountInput: '',
    foreignDiscountCoefficient: 0.88,
    foreignTotalUsd: '0.00',
    heightList: [],
    widthList: [],
    selectedHeight: 0,
    selectedWidth: 0,
    selectedTeeth: '',
    selectedColor: '',
    cart: [],
    province: '',
    city: '',
    region: [],
    includeFreight: true,
    transportType: 'express',
    discountTypeIndex: 0,
    discountOptions: [
      { label: '9.8折', value: 0.98 },
      { label: '无折扣', value: 1 },
      { label: '自定义折扣', value: -1 }
    ],
    discountInput: '',
    discountCoefficient: 0.98,
    productTotal: 0,
    discountedTotal: 0,
    noTaxTotal: 0,
    totalWeight: 0,
    totalPieces: 0,
    expressFreight: 0,
    expressTotal: 0,
    expressTotalNoTax: 0,
    logisticsFreight: 0,
    logisticsTotal: 0,
    logisticsTotalNoTax: 0,
    freightRule: null,
    logisticsRule: null
  },

  onLoad() {
    const savedRate = parseFloat(wx.getStorageSync('foreignExchangeRate'))
    if (Number.isFinite(savedRate) && savedRate > 0) {
      this.setData({ foreignExchangeRate: String(savedRate) })
    }
    const heights = [...new Set(products.map(p => p.specHeight))].sort((a, b) => a - b)
    const defaultHeight = heights.includes(20) ? 20 : heights[0]
    const defaultWidths = defaultHeight
      ? [...new Set(products.filter(p => p.specHeight === defaultHeight).map(p => p.specWidth))].sort((a, b) => a - b)
      : []
    this.setData({
      heightList: heights,
      selectedHeight: defaultHeight || 0,
      widthList: defaultWidths
    })

    const app = getApp()
    this.setData({ isAdmin: app.globalData.isAdmin })
    wx.cloud.callFunction({
      name: 'getOpenid'
    }).then(res => {
      const openid = res.result.openid
      return wx.cloud.database().collection('users').where({ _openid: openid }).get()
    }).then(dbRes => {
      if (dbRes.data && dbRes.data.length > 0) {
        const user = dbRes.data[0]
        if (user.role === 'admin') {
          this.setData({ isAdmin: true })
        }
      }
    }).catch(err => {
      console.error('检查管理员失败', err)
    })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  onQuoteModeTap(e) {
    const mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.quoteMode) return
    if (this.data.cart.length > 0) {
      wx.showModal({
        title: '切换报价模式',
        content: '切换报价模式将清空当前清单',
        confirmText: '继续切换',
        success: res => {
          if (res.confirm) this.applyQuoteMode(mode)
        }
      })
      return
    }
    this.applyQuoteMode(mode)
  },

  applyQuoteMode(mode) {
    this.setData({
      quoteMode: mode,
      cart: [],
      transportType: mode === 'fixed' ? 'express' : this.data.transportType,
      sampleMeters: '',
      sampleMeterHint: '',
      fixedLength: '',
      fixedQuantity: '',
      fixedLengthHint: '',
      productTotal: 0,
      discountedTotal: 0,
      noTaxTotal: 0,
      totalWeight: 0,
      totalPieces: 0,
      expressFreight: 0,
      expressTotal: 0,
      expressTotalNoTax: 0,
      logisticsFreight: 0,
      logisticsTotal: 0,
      logisticsTotalNoTax: 0,
      freightRule: null,
      logisticsRule: null,
      foreignTotalUsd: '0.00'
    })
  },

  onHeightTap(e) {
    const h = e.currentTarget.dataset.value
    const widths = [...new Set(
      products.filter(p => p.specHeight === h).map(p => p.specWidth)
    )].sort((a, b) => a - b)
    this.setData({
      selectedHeight: h,
      selectedWidth: 0,
      selectedTeeth: '',
      selectedColor: '',
      widthList: widths,
      sampleTeeth: [],
      sampleColors: [],
      sampleSpec: '',
      samplePrice: 0,
      sampleBasePrice: 0,
      sampleBoxMeters: 0,
      sampleBoxWeight: 0,
      sampleBoxWeightFullSeal: null,
      sampleMeterHint: ''
    })
  },

  onWidthTap(e) {
    const w = e.currentTarget.dataset.value
    const h = this.data.selectedHeight
    const matched = products.filter(p => p.specHeight === h && p.specWidth === w)
    if (matched.length === 0) return

    const prod = matched[0]
    const teeth = prod.availableTeeth || []
    const defaultColor = prod.availableColors && prod.availableColors.length === 1
      ? prod.availableColors[0]
      : ''

    this.setData({
      selectedWidth: w,
      selectedTeeth: '',
      selectedColor: defaultColor,
      sampleTeeth: teeth,
      sampleColors: prod.availableColors || [],
      sampleSpec: h + '×' + w,
      sampleBasePrice: prod.basePrice,
      sampleBoxMeters: prod.boxMeters,
      sampleBoxWeight: prod.boxWeight,
      sampleBoxWeightFullSeal: prod.boxWeightFullSeal || null,
      samplePrice: 0,
      sampleMeterHint: ''
    })
  },

  onTeethTap(e) {
    const t = e.currentTarget.dataset.value
    const bp = this.data.sampleBasePrice
    let price = bp
    if (t === '封口') {
      price = parseFloat((bp + 0.1).toFixed(2))
    } else if (t === '全封闭') {
      price = parseFloat((bp * 1.18).toFixed(2))
    }
    this.setData({ selectedTeeth: t, samplePrice: price })
  },

  onColorTap(e) {
    this.setData({ selectedColor: e.currentTarget.dataset.value })
  },

  onMetersInput(e) {
    const val = e.detail.value
    this.setData({ sampleMeters: val })
    this.updateMeterHint(val)
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
  },

  updateMeterHint(val) {
    const m = parseFloat(val)
    const boxMeters = this.data.sampleBoxMeters
    if (isNaN(m) || m <= 0 || !boxMeters) {
      this.setData({ sampleMeterHint: '' })
      return
    }
    if (m % boxMeters === 0) {
      this.setData({ sampleMeterHint: '正好是整箱倍数 ✓' })
    } else {
      const fullBox = Math.ceil(m / boxMeters)
      const suggestMeters = fullBox * boxMeters
      this.setData({ sampleMeterHint: '建议凑整箱：' + suggestMeters + ' 米（' + fullBox + '箱）' })
    }
  },

  addToCart() {
    if (this.data.quoteMode === 'foreign') {
      this.addForeignToCart()
      return
    }
    if (this.data.quoteMode === 'fixed') {
      this.addFixedToCart()
      return
    }

    const { selectedHeight, selectedWidth, selectedTeeth, selectedColor, sampleSpec, samplePrice, sampleMeters, sampleBoxMeters, sampleBoxWeight, sampleBoxWeightFullSeal, sampleBasePrice } = this.data
    if (!selectedHeight || !selectedWidth) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if (!selectedTeeth) {
      wx.showToast({ title: '请选择齿形', icon: 'none' })
      return
    }
    const meters = parseFloat(sampleMeters)
    if (isNaN(meters) || meters <= 0) {
      wx.showToast({ title: '请输入米数', icon: 'none' })
      return
    }
    if (!selectedColor && this.data.sampleColors.length > 0) {
      wx.showToast({ title: '请选择颜色', icon: 'none' })
      return
    }

    const spec = sampleSpec + ' ' + selectedTeeth + (selectedColor ? ' ' + selectedColor : '')
    const subtotal = parseFloat((meters * samplePrice).toFixed(2))
    const boxCount = meters / sampleBoxMeters
    const rowWeight = selectedTeeth === '全封闭' && sampleBoxWeightFullSeal
      ? boxCount * sampleBoxWeightFullSeal
      : boxCount * sampleBoxWeight
    const pieces = Math.ceil(meters / sampleBoxMeters)

    const cart = [...this.data.cart, {
      id: Date.now(),
      quoteType: 'standard',
      spec,
      height: selectedHeight,
      width: selectedWidth,
      teeth: selectedTeeth,
      color: selectedColor || this.data.sampleColors[0] || '',
      unitPrice: samplePrice,
      meters,
      boxMeters: sampleBoxMeters,
      boxWeight: sampleBoxWeight,
      boxWeightFullSeal: sampleBoxWeightFullSeal,
      subtotal,
      boxCount,
      rowWeight: parseFloat(rowWeight.toFixed(2)),
      pieces
    }]

    this.setData({
      cart,
      selectedHeight: 0,
      selectedWidth: 0,
      selectedTeeth: '',
      selectedColor: '',
      sampleTeeth: [],
      sampleColors: [],
      sampleSpec: '',
      samplePrice: 0,
      sampleBasePrice: 0,
      sampleBoxMeters: 0,
      sampleBoxWeight: 0,
      sampleBoxWeightFullSeal: null,
      sampleMeters: '',
      sampleMeterHint: '',
      widthList: []
    }, () => {
      this.recalc()
    })
  },

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
    return {
      cuttingRate,
      piecesPerTwoMeter,
      twoMeterCutPrice: parseFloat(twoMeterCutPrice.toFixed(2)),
      fixedUnitPrice,
      subtotal,
      weightPerMeter: parseFloat(weightPerMeter.toFixed(4)),
      weightPerPiece,
      rowWeight
    }
  },

  addFixedToCart() {
    const { selectedHeight, selectedWidth, selectedTeeth, selectedColor, sampleSpec, samplePrice, fixedLength, fixedQuantity, sampleBoxMeters, sampleBoxWeight, sampleBoxWeightFullSeal } = this.data
    if (!selectedHeight || !selectedWidth) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if (!selectedTeeth) {
      wx.showToast({ title: '请选择齿形', icon: 'none' })
      return
    }
    if (!selectedColor && this.data.sampleColors.length > 0) {
      wx.showToast({ title: '请选择颜色', icon: 'none' })
      return
    }

    const lengthM = parseFloat(fixedLength)
    if (isNaN(lengthM) || lengthM <= 0) {
      wx.showToast({ title: '请输入单根长度', icon: 'none' })
      return
    }
    if (lengthM > 2) {
      wx.showToast({ title: '单根长度不能超过 2米', icon: 'none' })
      return
    }

    const quantity = parseInt(fixedQuantity, 10)
    if (isNaN(quantity) || quantity <= 0 || String(quantity) !== String(fixedQuantity).trim()) {
      wx.showToast({ title: '请输入正确数量', icon: 'none' })
      return
    }

    const piecesPerTwoMeter = Math.floor(2 / lengthM)
    if (piecesPerTwoMeter < 1) {
      wx.showToast({ title: '单根长度不能超过 2米', icon: 'none' })
      return
    }

    const fixed = this.calculateFixedQuote({
      unitPrice: samplePrice,
      lengthM,
      quantity,
      boxMeters: sampleBoxMeters,
      boxWeight: sampleBoxWeight,
      boxWeightFullSeal: sampleBoxWeightFullSeal,
      teeth: selectedTeeth
    })
    const spec = sampleSpec + ' ' + selectedTeeth + (selectedColor ? ' ' + selectedColor : '')

    const cart = [...this.data.cart, {
      id: Date.now(),
      quoteType: 'fixed',
      spec,
      height: selectedHeight,
      width: selectedWidth,
      teeth: selectedTeeth,
      color: selectedColor || this.data.sampleColors[0] || '',
      unitPrice: fixed.fixedUnitPrice,
      baseMeterPrice: samplePrice,
      fixedLength: lengthM,
      quantity,
      meters: parseFloat((lengthM * quantity).toFixed(2)),
      boxMeters: sampleBoxMeters,
      boxWeight: sampleBoxWeight,
      boxWeightFullSeal: sampleBoxWeightFullSeal,
      subtotal: fixed.subtotal,
      boxCount: parseFloat(((lengthM * quantity) / sampleBoxMeters).toFixed(4)),
      rowWeight: fixed.rowWeight,
      weightPerMeter: fixed.weightPerMeter,
      weightPerPiece: fixed.weightPerPiece,
      pieces: quantity,
      piecesPerTwoMeter: fixed.piecesPerTwoMeter,
      twoMeterCutPrice: fixed.twoMeterCutPrice,
      cuttingRate: fixed.cuttingRate
    }]

    this.setData({
      cart,
      selectedHeight: 0,
      selectedWidth: 0,
      selectedTeeth: '',
      selectedColor: '',
      sampleTeeth: [],
      sampleColors: [],
      sampleSpec: '',
      samplePrice: 0,
      sampleBasePrice: 0,
      sampleBoxMeters: 0,
      sampleBoxWeight: 0,
      sampleBoxWeightFullSeal: null,
      fixedLength: '',
      fixedQuantity: '',
      fixedLengthHint: '',
      widthList: []
    }, () => {
      this.recalc()
    })
  },

  addForeignToCart() {
    const {
      selectedHeight, selectedWidth, selectedTeeth, selectedColor,
      sampleSpec, samplePrice, sampleMeters, sampleBoxMeters
    } = this.data
    if (!selectedHeight || !selectedWidth) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if (!selectedTeeth) {
      wx.showToast({ title: '请选择齿形', icon: 'none' })
      return
    }
    if (!selectedColor && this.data.sampleColors.length > 0) {
      wx.showToast({ title: '请选择颜色', icon: 'none' })
      return
    }
    const meters = parseFloat(sampleMeters)
    if (!Number.isFinite(meters) || meters <= 0) {
      wx.showToast({ title: '请输入米数', icon: 'none' })
      return
    }
    if (!(sampleBoxMeters > 0)) {
      wx.showToast({ title: '该规格缺少装箱数据', icon: 'none' })
      return
    }

    let typeEn
    let colorEn
    try {
      typeEn = translateTeeth(selectedTeeth)
      colorEn = translateColor(selectedColor || this.data.sampleColors[0] || '')
    } catch (err) {
      wx.showToast({ title: err.message, icon: 'none' })
      return
    }

    const cart = [...this.data.cart, {
      id: Date.now(),
      quoteType: 'foreign',
      specification: sampleSpec,
      typeEn,
      colorEn,
      teeth: selectedTeeth,
      color: selectedColor || this.data.sampleColors[0] || '',
      rmbUnitPrice: samplePrice,
      unitPrice: samplePrice,
      boxMeters: sampleBoxMeters,
      meters
    }]

    this.setData({
      cart,
      selectedHeight: 0,
      selectedWidth: 0,
      selectedTeeth: '',
      selectedColor: '',
      sampleTeeth: [],
      sampleColors: [],
      sampleSpec: '',
      samplePrice: 0,
      sampleBasePrice: 0,
      sampleBoxMeters: 0,
      sampleBoxWeight: 0,
      sampleBoxWeightFullSeal: null,
      sampleMeters: '',
      sampleMeterHint: '',
      widthList: []
    }, () => this.recalc())
  },

  onCartMetersInput(e) {
    const id = e.currentTarget.dataset.id
    const val = parseFloat(e.detail.value)
    if (isNaN(val) || val <= 0) return
    const cart = this.data.cart.map(item => {
      if (item.quoteType === 'fixed') return item
      if (item.id === id) {
        const meters = val
        if (item.quoteType === 'foreign') return { ...item, meters }
        const subtotal = parseFloat((meters * item.unitPrice).toFixed(2))
        const boxCount = meters / item.boxMeters
        const rowWeight = item.teeth === '全封闭' && item.boxWeightFullSeal
          ? boxCount * item.boxWeightFullSeal
          : boxCount * item.boxWeight
        const pieces = Math.ceil(meters / item.boxMeters)
        return { ...item, meters, subtotal, boxCount: parseFloat(boxCount.toFixed(4)), rowWeight: parseFloat(rowWeight.toFixed(2)), pieces }
      }
      return item
    })
    this.setData({ cart }, () => this.recalc())
  },

  onCartFixedQuantityInput(e) {
    const id = e.currentTarget.dataset.id
    const val = parseInt(e.detail.value, 10)
    if (isNaN(val) || val <= 0 || String(val) !== String(e.detail.value).trim()) {
      wx.showToast({ title: '请输入正确数量', icon: 'none' })
      return
    }
    const cart = this.data.cart.map(item => {
      if (item.id !== id || item.quoteType !== 'fixed') return item
      const quantity = val
      const meters = parseFloat((item.fixedLength * quantity).toFixed(2))
      const subtotal = parseFloat((item.unitPrice * quantity).toFixed(2))
      const rowWeight = parseFloat((item.weightPerPiece * quantity).toFixed(2))
      const boxCount = item.boxMeters ? parseFloat((meters / item.boxMeters).toFixed(4)) : item.boxCount
      return { ...item, quantity, meters, subtotal, rowWeight, boxCount, pieces: quantity }
    })
    this.setData({ cart }, () => this.recalc())
  },

  removeCartItem(e) {
    const id = e.currentTarget.dataset.id
    const cart = this.data.cart.filter(item => item.id !== id)
    this.setData({ cart }, () => this.recalc())
  },

  onRegionChange(e) {
    const [province, city] = e.detail.value
    this.setData({ province, city, region: e.detail.value }, () => {
      if (this.data.cart.length > 0) this.recalc()
    })
  },

  onFreightSwitch(e) {
    this.setData({ includeFreight: e.detail.value }, () => {
      this.recalc()
    })
  },

  onTransportChange(e) {
    if (this.data.quoteMode === 'fixed') {
      this.setData({ transportType: 'express' })
      return
    }
    this.setData({ transportType: e.detail.value })
  },

  onDiscountTypeChange(e) {
    const index = parseInt(e.detail.value)
    const option = this.data.discountOptions[index]
    if (option.value === -1) {
      this.setData({ discountTypeIndex: index, discountInput: '', discountCoefficient: 1 }, () => this.recalc())
    } else {
      this.setData({ discountTypeIndex: index, discountInput: '', discountCoefficient: option.value }, () => this.recalc())
    }
  },

  onDiscountBlur(e) {
    const raw = e.detail.value
    if (!raw || raw === '') {
      this.setData({ discountCoefficient: 1 }, () => this.recalc())
      return
    }
    const val = parseFloat(raw)
    if (isNaN(val) || val <= 0 || val > 100) {
      wx.showToast({ title: '折扣需在 0~100 之间', icon: 'none' })
      this.setData({ discountInput: '', discountCoefficient: 1 }, () => this.recalc())
      return
    }
    const coeff = parseFloat((val / 10).toFixed(4))
    this.setData({ discountInput: raw, discountCoefficient: coeff }, () => this.recalc())
  },

  onForeignExchangeRateBlur(e) {
    const value = String(e.detail.value || '').trim()
    const rate = parseFloat(value)
    if (!Number.isFinite(rate) || rate <= 0) {
      wx.showToast({ title: '请输入正确汇率', icon: 'none' })
      return
    }
    const normalized = String(rate)
    wx.setStorageSync('foreignExchangeRate', normalized)
    this.setData({ foreignExchangeRate: normalized }, () => this.recalc())
  },

  onForeignDiscountTypeChange(e) {
    const index = parseInt(e.detail.value, 10)
    const option = this.data.foreignDiscountOptions[index]
    const coefficient = option.value === -1 ? 1 : option.value
    this.setData({
      foreignDiscountTypeIndex: index,
      foreignDiscountInput: '',
      foreignDiscountCoefficient: coefficient
    }, () => this.recalc())
  },

  onForeignDiscountBlur(e) {
    const raw = String(e.detail.value || '').trim()
    const val = parseFloat(raw)
    if (!raw || !Number.isFinite(val) || val <= 0 || val > 100) {
      wx.showToast({ title: '折扣需在 0~100 之间', icon: 'none' })
      return
    }
    this.setData({
      foreignDiscountInput: raw,
      foreignDiscountCoefficient: parseFloat((val / 10).toFixed(4))
    }, () => this.recalc())
  },

  recalc() {
    if (this.data.quoteMode === 'foreign') {
      this.recalcForeign()
      return
    }
    const { cart, includeFreight, province, discountCoefficient } = this.data
    if (cart.length === 0) {
      this.setData({
        productTotal: 0, discountedTotal: 0, noTaxTotal: 0,
        totalWeight: 0, totalPieces: 0,
        expressFreight: 0, expressTotal: 0, expressTotalNoTax: 0,
        logisticsFreight: 0, logisticsTotal: 0, logisticsTotalNoTax: 0,
        freightRule: null, logisticsRule: null
      })
      return
    }

    let productTotal = 0
    let totalWeight = 0
    let totalPieces = 0
    cart.forEach(item => {
      productTotal += item.subtotal
      totalWeight += item.rowWeight
      totalPieces += item.pieces
    })
    productTotal = parseFloat(productTotal.toFixed(2))
    totalWeight = parseFloat(totalWeight.toFixed(2))
    const discountedTotal = parseFloat((productTotal * discountCoefficient).toFixed(2))
    const noTaxTotal = parseFloat((discountedTotal / 1.1).toFixed(2))

    const updateData = { productTotal, discountedTotal, noTaxTotal, totalWeight, totalPieces }

    if (includeFreight && province) {
      const fr = this.matchRule(freightRules, province)
      const lr = this.matchRule(logisticsRules, province)

      if (fr) {
        const weightFee = totalWeight * fr.pricePerKg
        const expressFreight = weightFee < fr.startPrice ? fr.startPrice : parseFloat(weightFee.toFixed(2))
        updateData.freightRule = fr
        updateData.expressFreight = parseFloat(expressFreight.toFixed(2))
        updateData.expressTotal = parseFloat((discountedTotal + expressFreight).toFixed(2))
        updateData.expressTotalNoTax = parseFloat((noTaxTotal + expressFreight).toFixed(2))
      } else {
        updateData.freightRule = null
        updateData.expressFreight = 0
        updateData.expressTotal = 0
        updateData.expressTotalNoTax = 0
      }

      if (lr) {
        const logisticsFreight = totalPieces * lr.pricePerPiece
        updateData.logisticsRule = lr
        updateData.logisticsFreight = parseFloat(logisticsFreight.toFixed(2))
        updateData.logisticsTotal = parseFloat((discountedTotal + logisticsFreight).toFixed(2))
        updateData.logisticsTotalNoTax = parseFloat((noTaxTotal + logisticsFreight).toFixed(2))
      } else {
        updateData.logisticsRule = null
        updateData.logisticsFreight = 0
        updateData.logisticsTotal = 0
        updateData.logisticsTotalNoTax = 0
      }
    } else {
      updateData.freightRule = null
      updateData.logisticsRule = null
      updateData.expressFreight = 0
      updateData.expressTotal = 0
      updateData.expressTotalNoTax = 0
      updateData.logisticsFreight = 0
      updateData.logisticsTotal = 0
      updateData.logisticsTotalNoTax = 0
    }

    this.setData(updateData)
  },

  recalcForeign() {
    const { cart, foreignDiscountCoefficient, foreignExchangeRate } = this.data
    if (cart.length === 0) {
      this.setData({ foreignTotalUsd: '0.00' })
      return
    }
    const rate = parseFloat(foreignExchangeRate)
    if (!Number.isFinite(rate) || rate <= 0) return
    try {
      const result = recalculateForeignCart(
        cart,
        foreignDiscountCoefficient,
        rate
      )
      this.setData({
        cart: result.lines,
        foreignTotalUsd: result.totalUsd
      })
    } catch (err) {
      wx.showToast({ title: err.message, icon: 'none' })
    }
  },

  matchRule(rules, pickerProvince) {
    for (const r of rules) {
      if (r.province === pickerProvince) return r
    }
    const short = pickerProvince.replace(/(省|市|自治区)$/, '')
    for (const r of rules) {
      if (r.province.replace(/(省|市|自治区)$/, '') === short) return r
    }
    const specialMap = {
      '广西壮族自治区': '广西',
      '内蒙古自治区': '内蒙古',
      '西藏自治区': '西藏',
      '宁夏回族自治区': '宁夏',
      '新疆维吾尔自治区': '新疆',
      '香港特别行政区': '香港',
      '澳门特别行政区': '澳门'
    }
    const mapped = specialMap[pickerProvince]
    if (mapped) {
      for (const r of rules) {
        if (r.province === mapped) return r
      }
    }
    for (const r of rules) {
      if (r.province.includes(short) || short.includes(r.province)) return r
    }
    return null
  },

  onSubmit() {
    if (this.data.cart.length === 0) {
      wx.showToast({ title: '请先添加产品到报价清单', icon: 'none' })
      return
    }
    if (this.data.quoteMode === 'foreign') {
      const rate = parseFloat(this.data.foreignExchangeRate)
      if (!Number.isFinite(rate) || rate <= 0) {
        wx.showToast({ title: '请输入正确汇率', icon: 'none' })
        return
      }
      const option = this.data.foreignDiscountOptions[
        this.data.foreignDiscountTypeIndex
      ]
      if (option && option.value === -1 && !this.data.foreignDiscountInput) {
        wx.showToast({ title: '请输入自定义折扣', icon: 'none' })
        return
      }
      const quoteData = {
        quoteMode: 'foreign',
        cart: this.data.cart.map(item => ({
          id: item.id,
          specification: item.specification,
          typeEn: item.typeEn,
          colorEn: item.colorEn,
          meters: item.meters,
          fobUnitPriceUsd: item.fobUnitPriceUsd,
          amountUsd: item.amountUsd,
          amountUsdRaw: item.amountUsdRaw
        })),
        foreignTotalUsd: this.data.foreignTotalUsd
      }
      this.navigateToResult(quoteData)
      return
    }
    if (this.data.includeFreight && !this.data.province) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }
    const curOption = this.data.discountOptions[this.data.discountTypeIndex]
    if (curOption && curOption.value === -1) {
      if (!this.data.discountInput || this.data.discountInput === '') {
        wx.showToast({ title: '请输入自定义折扣', icon: 'none' })
        return
      }
    }

    const quoteData = {
      cart: this.data.cart,
      productTotal: this.data.productTotal,
      discountedTotal: this.data.discountedTotal,
      noTaxTotal: this.data.noTaxTotal,
      totalWeight: this.data.totalWeight,
      totalPieces: this.data.totalPieces,
      province: this.data.includeFreight ? this.data.province : '',
      city: this.data.includeFreight ? this.data.city : '',
      discount: this.data.discountCoefficient,
      discountDisplay: this.data.discountCoefficient === 1 ? '' : String(this.data.discountCoefficient * 10).replace(/\.?0+$/, ''),
      includeFreight: this.data.includeFreight,
      quoteMode: this.data.quoteMode,
      transportType: this.data.quoteMode === 'fixed' ? 'express' : this.data.transportType,
      expressFreight: this.data.expressFreight,
      expressTotal: this.data.expressTotal,
      expressTotalNoTax: this.data.expressTotalNoTax,
      logisticsFreight: this.data.logisticsFreight,
      logisticsTotal: this.data.logisticsTotal,
      logisticsTotalNoTax: this.data.logisticsTotalNoTax,
      freightRule: this.data.freightRule,
      logisticsRule: this.data.logisticsRule
    }

    this.navigateToResult(quoteData)
  },

  navigateToResult(quoteData) {
    wx.navigateTo({
      url: '/pages/quoteResult/quoteResult',
      success: res => {
        res.eventChannel.emit('quoteData', quoteData)
      },
      fail: err => {
        console.error('导航失败', err)
        app.globalData.quoteData = quoteData
        wx.navigateTo({ url: '/pages/quoteResult/quoteResult' })
      }
    })
  }
})
