const app = getApp()
const products = require('../../data/products')
const freightRules = require('../../data/freightRules')
const logisticsRules = require('../../data/logisticsRules')

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
    const heights = [...new Set(products.map(p => p.specHeight))].sort((a, b) => a - b)
    this.setData({ heightList: heights })

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

  onCartMetersInput(e) {
    const id = e.currentTarget.dataset.id
    const val = parseFloat(e.detail.value)
    if (isNaN(val) || val <= 0) return
    const cart = this.data.cart.map(item => {
      if (item.id === id) {
        const meters = val
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

  recalc() {
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
      transportType: this.data.transportType,
      expressFreight: this.data.expressFreight,
      expressTotal: this.data.expressTotal,
      expressTotalNoTax: this.data.expressTotalNoTax,
      logisticsFreight: this.data.logisticsFreight,
      logisticsTotal: this.data.logisticsTotal,
      logisticsTotalNoTax: this.data.logisticsTotalNoTax,
      freightRule: this.data.freightRule,
      logisticsRule: this.data.logisticsRule
    }

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
