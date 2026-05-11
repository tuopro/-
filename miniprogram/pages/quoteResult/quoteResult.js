// ==================== pages/quoteResult/quoteResult.js ====================
const app = getApp()

// Canvas 常量
const CANVAS_W = 375
const PAD_X = 15
const CONTENT_W = CANVAS_W - PAD_X * 2

Page({
  data: {
    loading: true,
    errorMsg: '',

    // 传入数据
    productList: [],
    province: '',
    city: '',
    discount: 1,
    discountDisplay: '',
    includeFreight: true,  // 是否含运费

    // 计算结果
    productTotal: 0,
    discountedTotal: 0,
    noTaxTotal: 0,         // 产品不含税总价 = discountedTotal / 1.1
    totalWeight: 0,
    totalPieces: 0,

    // 快递配送
    freightRule: { startPrice: 0, pricePerKg: 0 },
    expressFreight: 0,
    expressTotal: 0,        // 快递总价（含税）
    expressTotalNoTax: 0,   // 快递总价（不含税）
    expressConfigured: false,

    // 物流自提
    logisticsRule: { pricePerPiece: 0 },
    logisticsFreight: 0,
    logisticsTotal: 0,        // 自提总价（含税）
    logisticsTotalNoTax: 0,   // 自提总价（不含税）
    logisticsConfigured: false
  },

  onLoad() {
    const eventChannel = this.getOpenerEventChannel &&
      this.getOpenerEventChannel()
    if (eventChannel) {
      eventChannel.on('quoteData', data => {
        this.initData(data)
      })
    }

    setTimeout(() => {
      if (this.data.loading && app.globalData.quoteData) {
        this.initData(app.globalData.quoteData)
        app.globalData.quoteData = null
      }
    }, 300)
  },

  // ========== 初始化 ==========
  async initData(data) {
    if (!data || this.data.productList.length > 0) return

    const { productList, province, city, discount = 1, includeFreight = true } = data
    wx.showLoading({ title: '计算中…' })

    let productTotal = 0
    let totalWeight = 0
    let totalPieces = 0

    const enrichedList = productList.map(item => {
      const subtotal = item.unitPrice * item.quantity
      productTotal += subtotal
      totalWeight += item.weight * item.quantity
      totalPieces += item.quantity
      return {
        ...item,
        subtotal,
        dsubtotal: parseFloat((subtotal * discount).toFixed(2))
      }
    })

    const discountedTotal = parseFloat((productTotal * discount).toFixed(2))
    const noTaxTotal = parseFloat((discountedTotal / 1.1).toFixed(2))
    const discountDisplay = discount === 1
      ? ''
      : String(discount * 10).replace(/\.?0+$/, '')

    this.setData({
      productList: enrichedList,
      province, city,
      discount,
      discountDisplay,
      includeFreight,
      productTotal,
      discountedTotal,
      noTaxTotal,
      totalWeight,
      totalPieces
    })

    // 仅含运费时查询运费规则
    if (includeFreight) {
      try {
        await this.fetchFreightRules(province, totalWeight, discountedTotal, noTaxTotal)
      } catch (e) {
        console.warn('快递规则查询失败', e)
      }

      try {
        await this.fetchLogisticsRules(province, totalPieces, discountedTotal, noTaxTotal)
      } catch (e) {
        console.warn('物流规则查询失败', e)
      }

      if (!this.data.expressConfigured && !this.data.logisticsConfigured) {
        this.setData({
          loading: false,
          errorMsg: `${province} 暂未配置运费规则，请联系管理员`
        })
        wx.hideLoading()
        return
      }
    }

    this.setData({ loading: false })

    wx.hideLoading()
  },

  // ========== 快递运费（逐页拉取全部规则）==========
  fetchFreightRules(pickerProvince, totalWeight, baseTotal, noTaxTotal) {
    const PAGE_SIZE = 20
    let allRules = []

    const fetchNext = (skip) => {
      return wx.cloud.database().collection('freightRules')
        .orderBy('sort', 'asc')
        .skip(skip)
        .limit(PAGE_SIZE)
        .get()
        .then(res => {
          allRules = allRules.concat(res.data)
          if (res.data.length >= PAGE_SIZE) {
            return fetchNext(skip + PAGE_SIZE)
          }
          return allRules
        })
    }

    return fetchNext(0).then(dbList => {
      console.log(`[freightRules] 共 ${dbList.length} 条`)
      const dbProvinces = dbList.map(r => r.province)
      const matched = app.matchProvince(dbProvinces, pickerProvince)

      if (!matched) {
        console.warn(`[freightRules] 未匹配: ${pickerProvince}`)
        this.setData({
          freightRule: { startPrice: 0, pricePerKg: 0 },
          expressFreight: 0,
          expressTotal: 0,
          expressTotalNoTax: 0,
          expressConfigured: false
        })
        return
      }

      const rule = dbList.find(r => r.province === matched)
      if (!rule) {
        console.warn(`[freightRules] matched="${matched}" 但未找到记录`)
        this.setData({
          expressFreight: 0,
          expressTotal: 0,
          expressTotalNoTax: 0,
          expressConfigured: false
        })
        return
      }

      const weightFee = totalWeight * rule.pricePerKg
      const expressFreight = weightFee < rule.startPrice
        ? rule.startPrice
        : weightFee

      this.setData({
        freightRule: { startPrice: rule.startPrice, pricePerKg: rule.pricePerKg },
        expressFreight: parseFloat(expressFreight.toFixed(2)),
        expressTotal: parseFloat((baseTotal + expressFreight).toFixed(2)),
        expressTotalNoTax: parseFloat((noTaxTotal + expressFreight).toFixed(2)),
        expressConfigured: true
      })
    })
  },

  // ========== 物流运费（逐页拉取全部规则）==========
  fetchLogisticsRules(pickerProvince, totalPieces, baseTotal, noTaxTotal) {
    const PAGE_SIZE = 20
    let allRules = []

    const fetchNext = (skip) => {
      return wx.cloud.database().collection('logisticsRules')
        .orderBy('sort', 'asc')
        .skip(skip)
        .limit(PAGE_SIZE)
        .get()
        .then(res => {
          allRules = allRules.concat(res.data)
          if (res.data.length >= PAGE_SIZE) {
            return fetchNext(skip + PAGE_SIZE)
          }
          return allRules
        })
    }

    return fetchNext(0).then(dbList => {
      console.log(`[logisticsRules] 共 ${dbList.length} 条`)
      const dbProvinces = dbList.map(r => r.province)
      const matched = app.matchProvince(dbProvinces, pickerProvince)

      if (!matched) {
        console.warn(`[logisticsRules] 未匹配: ${pickerProvince}`)
        this.setData({
          logisticsRule: { pricePerPiece: 0 },
          logisticsFreight: 0,
          logisticsTotal: 0,
          logisticsTotalNoTax: 0,
          logisticsConfigured: false
        })
        return
      }

      const rule = dbList.find(r => r.province === matched)
      if (!rule) {
        console.warn(`[logisticsRules] matched="${matched}" 但未找到记录`)
        this.setData({
          logisticsFreight: 0,
          logisticsTotal: 0,
          logisticsTotalNoTax: 0,
          logisticsConfigured: false
        })
        return
      }

      const logisticsFreight = totalPieces * rule.pricePerPiece

      this.setData({
        logisticsRule: { pricePerPiece: rule.pricePerPiece },
        logisticsFreight: parseFloat(logisticsFreight.toFixed(2)),
        logisticsTotal: parseFloat((baseTotal + logisticsFreight).toFixed(2)),
        logisticsTotalNoTax: parseFloat((noTaxTotal + logisticsFreight).toFixed(2)),
        logisticsConfigured: true
      })
    })
  },

  // ========== 复制报价单 ==========
  onCopy() {
    const d = this.data

    let productLines = ''
    d.productList.forEach(item => {
      const w = item.weight * item.quantity
      productLines += `${item.spec}  ¥${item.unitPrice} × ${item.quantity}  = ¥${item.subtotal} (${w}kg)`
      if (d.discount !== 1) {
        productLines += ` → 折后 ¥${item.dsubtotal}`
      }
      productLines += '\n'
    })

    let text = `【报价单】
产品明细：
${productLines}`
    if (d.discount !== 1) {
      text += `产品原价合计：¥${d.productTotal}  产品折后合计：¥${d.discountedTotal}
客户折扣：${d.discountDisplay}折
`
    } else {
      text += `产品总价：¥${d.productTotal}  `
    }
    text += `总重量：${d.totalWeight}kg  总件数：${d.totalPieces}件`
    text += `
产品不含税总价：¥${d.noTaxTotal}`

    if (d.includeFreight) {
      if (d.expressConfigured) {
        text += `
快递配送：起步价¥${d.freightRule.startPrice}，续重¥${d.freightRule.pricePerKg}/kg，运费¥${d.expressFreight}，总价（含税）¥${d.expressTotal}，不含税¥${d.expressTotalNoTax}`
      } else {
        text += `
快递配送：暂未配置`
      }

      if (d.logisticsConfigured) {
        text += `
物流自提：${d.totalPieces}件 × ¥${d.logisticsRule.pricePerPiece}/件，运费¥${d.logisticsFreight}，总价（含税）¥${d.logisticsTotal}，不含税¥${d.logisticsTotalNoTax}`
      } else {
        text += `
物流自提：暂未配置`
      }

      text += `
收货地址：${d.province} ${d.city}`
    } else {
      text += `
报价总价：¥${d.discountedTotal}`
    }

    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制报价单', icon: 'success' })
      }
    })
  },

  // ================================================================
  //                    生成报价单图片 (OffscreenCanvas)
  // ================================================================
  onGenerateImage() {
    const d = this.data
    wx.showLoading({ title: '生成图片…' })

    // 1. 计算画布尺寸
    const rowCount = d.productList.length
    const canvasH = this.calcCanvasHeight(rowCount)
    const dpr = wx.getSystemInfoSync().pixelRatio

    // 2. 创建离屏 Canvas（不依赖 DOM，不会 timeout）
    const canvas = wx.createOffscreenCanvas({
      type: '2d',
      width: CANVAS_W * dpr,
      height: canvasH * dpr
    })
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    // 3. 绘制
    this.drawQuote(ctx, d, canvasH)

    // 4. 导出为 JPG
    wx.canvasToTempFilePath({
      canvas,
      fileType: 'jpg',
      quality: 0.9,
      success: (res) => {
        wx.hideLoading()
        this.previewOrSave(res.tempFilePath)
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('导出图片失败', err)
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  },

  // ---------- 计算画布高度 ----------
  calcCanvasHeight(rowCount) {
    // 顶部区域：蓝条4 + 空白 + 公司名 + 标题 + 分隔线 + 表头
    let h = 4 + 16 + 26 + 26 + 14 + 20
    // 产品行
    h += rowCount * 26
    // 分隔线 + 折后合计 + 不含税 + 总重/件数
    h += 14 + 30 + 22 + 24
    // 快递配送区
    h += 14 + 24 + 20 * 2 + 24 + 26 + 28
    // 物流自提区
    h += 24 + 20 * 2 + 24 + 26 + 28
    // 折扣 + 地址
    h += 14 + 20 + 22 + 8
    // 底部备注
    h += 14 + 20 + 20 + 16
    return Math.max(h, 550)
  },

  // ================================================================
  //                    绘制全部内容
  // ================================================================
  drawQuote(ctx, d, canvasH) {
    // ★ 关键：设 textBaseline='top'，y 就是文字顶部，不再用基线
    ctx.textBaseline = 'top'

    let y = 0

    // ----- 白色背景 -----
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, CANVAS_W, canvasH)

    // ----- 顶部蓝色装饰条 -----
    ctx.fillStyle = '#2563EB'
    ctx.fillRect(0, 0, CANVAS_W, 4)
    y = 20  // 蓝条下面留 16px 空白

    // ========== 列锚点 ==========
    const X_SPEC = PAD_X        // 15
    const X_PRICE = 210
    const X_QTY = 270
    const X_SUB = 360

    // ========== a. 公司名称 ==========
    ctx.fillStyle = '#1D4ED8'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('CNDES德赛线槽', CANVAS_W / 2, y)
    y += 26  // 20px 字高 + 6px 间距

    // ========== b. 标题 ==========
    ctx.fillStyle = '#333'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText('客户报价单', CANVAS_W / 2, y)
    y += 26  // 18px 字高 + 8px 间距

    // ========== c/d. 分隔线 ==========
    y = this.drawSep(ctx, y)

    // ========== e. 产品表头 ==========
    ctx.fillStyle = '#999'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('规格', X_SPEC, y)
    ctx.textAlign = 'right'
    ctx.fillText('单价', X_PRICE, y)
    ctx.textAlign = 'center'
    ctx.fillText('数量', X_QTY, y)
    ctx.textAlign = 'right'
    ctx.fillText('小计', X_SUB, y)
    y += 20  // 12px 字 + 8px 到底线

    // 表头下划线
    ctx.strokeStyle = '#D1D5DB'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD_X, y)
    ctx.lineTo(CANVAS_W - PAD_X, y)
    ctx.stroke()

    // ========== f. 产品行 ==========
    ctx.font = '13px sans-serif'
    d.productList.forEach((item, idx) => {
      // 隔行浅灰底纹
      if (idx % 2 === 0) {
        ctx.fillStyle = '#F9FAFB'
        ctx.fillRect(PAD_X, y, CONTENT_W, 26)
      }
      const ty = y + 5  // 行内文字垂直居中偏移

      ctx.fillStyle = '#333'
      ctx.textAlign = 'left'
      const spec = item.spec.length > 12 ? item.spec.slice(0, 11) + '…' : item.spec
      ctx.fillText(spec, X_SPEC, ty)

      ctx.textAlign = 'right'
      ctx.fillText(`¥${item.unitPrice}`, X_PRICE, ty)

      ctx.textAlign = 'center'
      ctx.fillText(`${item.quantity}`, X_QTY, ty)

      ctx.textAlign = 'right'
      const showSub = d.discount !== 1 ? item.dsubtotal : item.subtotal
      ctx.fillText(`¥${showSub}`, X_SUB, ty)
      y += 26
    })

    // ========== g. 分隔线 ==========
    y = this.drawSep(ctx, y)

    // ========== h. 产品总价 ==========
    ctx.fillStyle = '#333'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'left'
    const totalLabel = d.discount !== 1 ? '折后合计' : '产品总价'
    ctx.fillText(totalLabel, X_SPEC, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#2563EB'
    ctx.font = 'bold 20px sans-serif'
    const displayTotal = d.discount !== 1 ? d.discountedTotal : d.productTotal
    ctx.fillText(`¥${displayTotal}`, X_SUB, y)
    y += 30

    // 产品不含税总价
    ctx.fillStyle = '#999'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`不含税 ¥${d.noTaxTotal}`, X_SUB, y)
    y += 22

    // 总重 / 总件数
    ctx.font = '13px sans-serif'
    ctx.fillStyle = '#666'
    ctx.textAlign = 'left'
    ctx.fillText(`总重 ${d.totalWeight}kg    总件数 ${d.totalPieces}件`, X_SPEC, y)
    y += 24

    // ========== i. 快递配送 ==========
    y = this.drawSep(ctx, y, '#E5E7EB')

    ctx.fillStyle = '#2563EB'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('快递配送', X_SPEC, y)
    y += 24

    if (d.expressConfigured) {
      ctx.font = '13px sans-serif'
      ctx.fillStyle = '#666'
      ctx.textAlign = 'left'
      ctx.fillText(`总重 ${d.totalWeight}kg`, X_SPEC, y)
      ctx.textAlign = 'right'
      ctx.fillText(`起步价 ¥${d.freightRule.startPrice}`, X_SUB, y)
      y += 22

      ctx.textAlign = 'left'
      ctx.fillText(`续重 ¥${d.freightRule.pricePerKg}/kg`, X_SPEC, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#333'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText(`运费 ¥${d.expressFreight}`, X_SUB, y)
      y += 24

      ctx.font = 'bold 16px sans-serif'
      ctx.fillStyle = '#2563EB'
      ctx.fillText(`总价（含税） ¥${d.expressTotal}`, X_SUB, y)
      y += 26

      ctx.fillStyle = '#999'
      ctx.font = 'bold 13px sans-serif'
      ctx.fillText(`不含税 ¥${d.expressTotalNoTax}`, X_SUB, y)
      y += 28
    } else {
      ctx.font = '13px sans-serif'
      ctx.fillStyle = '#999'
      ctx.textAlign = 'center'
      ctx.fillText('暂未配置', CANVAS_W / 2, y)
      y += 24
    }

    // ========== j. 物流自提 ==========
    ctx.fillStyle = '#0891B2'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('物流自提', X_SPEC, y)
    y += 24

    if (d.logisticsConfigured) {
      ctx.font = '13px sans-serif'
      ctx.fillStyle = '#666'
      ctx.textAlign = 'left'
      ctx.fillText(`总件数 ${d.totalPieces}件`, X_SPEC, y)
      ctx.textAlign = 'right'
      ctx.fillText(`¥${d.logisticsRule.pricePerPiece}/件`, X_SUB, y)
      y += 22

      ctx.textAlign = 'right'
      ctx.fillStyle = '#333'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText(`运费 ¥${d.logisticsFreight}`, X_SUB, y)
      y += 24

      ctx.font = 'bold 16px sans-serif'
      ctx.fillStyle = '#2563EB'
      ctx.fillText(`总价（含税） ¥${d.logisticsTotal}`, X_SUB, y)
      y += 26

      ctx.fillStyle = '#999'
      ctx.font = 'bold 13px sans-serif'
      ctx.fillText(`不含税 ¥${d.logisticsTotalNoTax}`, X_SUB, y)
      y += 28
    } else {
      ctx.font = '13px sans-serif'
      ctx.fillStyle = '#999'
      ctx.textAlign = 'center'
      ctx.fillText('暂未配置', CANVAS_W / 2, y)
      y += 24
    }

    // ========== k. 折扣 + 地址 ==========
    y = this.drawSep(ctx, y, '#E5E7EB')

    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#666'
    ctx.textAlign = 'left'
    const disLabel = d.discount === 1 ? '客户折扣：无' : `客户折扣：${d.discountDisplay}折`
    ctx.fillText(disLabel, X_SPEC, y)
    y += 20

    ctx.fillText(`收货地址：${d.province} ${d.city}`, X_SPEC, y)
    y += 30

    // ========== l. 底部备注 ==========
    y = this.drawSep(ctx, y, '#E5E7EB')

    ctx.fillStyle = '#999'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    ctx.fillText('品质线槽，选择CNDES德赛', CANVAS_W / 2, y)
    ctx.fillText(dateStr, CANVAS_W / 2, y + 18)
  },

  // ---------- 分隔线 ----------
  drawSep(ctx, y, color) {
    const sepY = y + 6
    ctx.strokeStyle = color || '#D1D5DB'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD_X, sepY)
    ctx.lineTo(CANVAS_W - PAD_X, sepY)
    ctx.stroke()
    return sepY + 8
  },

  // ---------- 预览 / 保存 ----------
  previewOrSave(filePath) {
    wx.showModal({
      title: '报价单已生成',
      content: '是否保存到相册？',
      confirmText: '保存',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.saveToAlbum(filePath)
        }
      }
    })
  },

  saveToAlbum(filePath) {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许小程序保存图片到相册',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  }
})
