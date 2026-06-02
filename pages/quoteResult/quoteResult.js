const app = getApp()

const CANVAS_W = 375
const PAD_X = 15
const CONTENT_W = CANVAS_W - PAD_X * 2

Page({
  data: {
    loading: true,
    productList: [],
    province: '',
    city: '',
    discount: 1,
    discountDisplay: '',
    includeFreight: true,
    productTotal: 0,
    discountedTotal: 0,
    noTaxTotal: 0,
    totalWeight: 0,
    totalPieces: 0,
    freightRule: null,
    expressFreight: 0,
    expressTotal: 0,
    expressTotalNoTax: 0,
    expressConfigured: false,
    logisticsRule: null,
    logisticsFreight: 0,
    logisticsTotal: 0,
    logisticsTotalNoTax: 0,
    logisticsConfigured: false
  },

  onLoad() {
    const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
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

  initData(data) {
    if (!data || this.data.productList.length > 0) return

    const {
      cart = [],
      productTotal = 0,
      discountedTotal = 0,
      noTaxTotal = 0,
      totalWeight = 0,
      totalPieces = 0,
      province = '',
      city = '',
      discount = 1,
      discountDisplay = '',
      includeFreight = true,
      freightRule = null,
      expressFreight = 0,
      expressTotal = 0,
      expressTotalNoTax = 0,
      logisticsRule = null,
      logisticsFreight = 0,
      logisticsTotal = 0,
      logisticsTotalNoTax = 0
    } = data

    const productList = cart.map(item => {
      const dsubtotal = parseFloat((item.subtotal * discount).toFixed(2))
      return { ...item, dsubtotal }
    })

    this.setData({
      loading: false,
      productList,
      province,
      city,
      discount,
      discountDisplay: discountDisplay || (discount === 1 ? '' : String(discount * 10).replace(/\.?0+$/, '')),
      includeFreight,
      productTotal,
      discountedTotal,
      noTaxTotal,
      totalWeight,
      totalPieces,
      freightRule,
      expressFreight,
      expressTotal,
      expressTotalNoTax,
      expressConfigured: !!freightRule,
      logisticsRule,
      logisticsFreight,
      logisticsTotal,
      logisticsTotalNoTax,
      logisticsConfigured: !!logisticsRule
    })
  },

  onCopy() {
    const d = this.data
    let productLines = ''
    d.productList.forEach(item => {
      productLines += `${item.spec}  ¥${item.unitPrice}/米 × ${item.meters}米  = ¥${item.subtotal}`
      if (d.discount !== 1) {
        productLines += ` → 折后 ¥${item.dsubtotal}`
      }
      productLines += '\n'
    })

    let text = `【CNDES德赛线槽报价单】
${productLines}`
    if (d.discount !== 1) {
      text += `产品原价合计：¥${d.productTotal}
产品折后合计：¥${d.discountedTotal}
客户折扣：${d.discountDisplay}折
`
    } else {
      text += `产品总价：¥${d.productTotal}
`
    }
    text += `总重量：${d.totalWeight}kg  总件数：${d.totalPieces}件
产品不含税总价：¥${d.noTaxTotal}`

    if (d.includeFreight) {
      if (d.expressConfigured) {
        text += `
【快递配送】起步价¥${d.freightRule.startPrice}，续重¥${d.freightRule.pricePerKg}/kg，运费¥${d.expressFreight}，总价（含税）¥${d.expressTotal}，不含税¥${d.expressTotalNoTax}`
      } else {
        text += `
【快递配送】暂未配置`
      }
      if (d.logisticsConfigured) {
        text += `
【物流自提】${d.totalPieces}件 × ¥${d.logisticsRule.pricePerPiece}/件，运费¥${d.logisticsFreight}，总价（含税）¥${d.logisticsTotal}，不含税¥${d.logisticsTotalNoTax}`
      } else {
        text += `
【物流自提】暂未配置`
      }
      text += `
收货地址：${d.province} ${d.city}`
    }

    text += `

品质线槽，选择CNDES德赛`

    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制报价单', icon: 'success' })
      }
    })
  },

  onGenerateImage() {
    const d = this.data
    wx.showLoading({ title: '生成图片…' })

    const rowCount = d.productList.length
    const canvasH = this.calcCanvasHeight(rowCount)
    const dpr = wx.getSystemInfoSync().pixelRatio

    const canvas = wx.createOffscreenCanvas({
      type: '2d',
      width: CANVAS_W * dpr,
      height: canvasH * dpr
    })
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    this.drawQuote(ctx, d, canvasH)

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

  calcCanvasHeight(rowCount) {
    let h = 4 + 16 + 26 + 26 + 14 + 20
    h += rowCount * 26
    h += 14 + 30 + 22 + 24
    h += 14 + 24 + 20 * 2 + 24 + 26 + 28
    h += 24 + 20 * 2 + 24 + 26 + 28
    h += 14 + 20 + 22 + 8
    h += 14 + 20 + 20 + 16
    return Math.max(h, 550)
  },

  drawQuote(ctx, d, canvasH) {
    ctx.textBaseline = 'top'
    let y = 0

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, CANVAS_W, canvasH)

    ctx.fillStyle = '#2563EB'
    ctx.fillRect(0, 0, CANVAS_W, 4)
    y = 20

    const X_SPEC = PAD_X
    const X_PRICE = 200
    const X_METERS = 260
    const X_SUB = 360

    ctx.fillStyle = '#1D4ED8'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('CNDES德赛线槽', CANVAS_W / 2, y)
    y += 26

    ctx.fillStyle = '#333'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText('客户报价单', CANVAS_W / 2, y)
    y += 26

    y = this.drawSep(ctx, y)

    ctx.fillStyle = '#86868B'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('规格', X_SPEC, y)
    ctx.textAlign = 'right'
    ctx.fillText('单价', X_PRICE, y)
    ctx.textAlign = 'center'
    ctx.fillText('米数', X_METERS, y)
    ctx.textAlign = 'right'
    ctx.fillText('小计', X_SUB, y)
    y += 20

    ctx.strokeStyle = '#D1D5DB'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD_X, y)
    ctx.lineTo(CANVAS_W - PAD_X, y)
    ctx.stroke()

    ctx.font = '13px sans-serif'
    d.productList.forEach((item, idx) => {
      if (idx % 2 === 0) {
        ctx.fillStyle = '#F9FAFB'
        ctx.fillRect(PAD_X, y, CONTENT_W, 26)
      }
      const ty = y + 5

      ctx.fillStyle = '#333'
      ctx.textAlign = 'left'
      const spec = item.spec.length > 10 ? item.spec.slice(0, 9) + '…' : item.spec
      ctx.fillText(spec, X_SPEC, ty)

      ctx.textAlign = 'right'
      ctx.fillText('¥' + item.unitPrice, X_PRICE, ty)

      ctx.textAlign = 'center'
      ctx.fillText('' + item.meters, X_METERS, ty)

      ctx.textAlign = 'right'
      const showSub = d.discount !== 1 ? item.dsubtotal : item.subtotal
      ctx.fillText('¥' + showSub, X_SUB, ty)
      y += 26
    })

    y = this.drawSep(ctx, y)

    ctx.fillStyle = '#333'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'left'
    const totalLabel = d.discount !== 1 ? '折后合计' : '产品总价'
    ctx.fillText(totalLabel, X_SPEC, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#2563EB'
    ctx.font = 'bold 20px sans-serif'
    const displayTotal = d.discount !== 1 ? d.discountedTotal : d.productTotal
    ctx.fillText('¥' + displayTotal, X_SUB, y)
    y += 30

    ctx.fillStyle = '#86868B'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('不含税 ¥' + d.noTaxTotal, X_SUB, y)
    y += 22

    ctx.font = '13px sans-serif'
    ctx.fillStyle = '#86868B'
    ctx.textAlign = 'left'
    ctx.fillText('总重 ' + d.totalWeight + 'kg    总件数 ' + d.totalPieces + '件', X_SPEC, y)
    y += 24

    y = this.drawSep(ctx, y, '#E5E7EB')

    ctx.fillStyle = '#2563EB'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('快递配送', X_SPEC, y)
    y += 24

    if (d.expressConfigured) {
      ctx.font = '13px sans-serif'
      ctx.fillStyle = '#86868B'
      ctx.textAlign = 'left'
      ctx.fillText('总重 ' + d.totalWeight + 'kg', X_SPEC, y)
      ctx.textAlign = 'right'
      ctx.fillText('起步价 ¥' + d.freightRule.startPrice, X_SUB, y)
      y += 22

      ctx.textAlign = 'left'
      ctx.fillText('续重 ¥' + d.freightRule.pricePerKg + '/kg', X_SPEC, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#333'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText('运费 ¥' + d.expressFreight, X_SUB, y)
      y += 24

      ctx.font = 'bold 16px sans-serif'
      ctx.fillStyle = '#2563EB'
      ctx.fillText('总价（含税） ¥' + d.expressTotal, X_SUB, y)
      y += 26

      ctx.fillStyle = '#86868B'
      ctx.font = 'bold 13px sans-serif'
      ctx.fillText('不含税 ¥' + d.expressTotalNoTax, X_SUB, y)
      y += 28
    } else {
      ctx.font = '13px sans-serif'
      ctx.fillStyle = '#86868B'
      ctx.textAlign = 'center'
      ctx.fillText('暂未配置', CANVAS_W / 2, y)
      y += 24
    }

    ctx.fillStyle = '#059669'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('物流自提', X_SPEC, y)
    y += 24

    if (d.logisticsConfigured) {
      ctx.font = '13px sans-serif'
      ctx.fillStyle = '#86868B'
      ctx.textAlign = 'left'
      ctx.fillText('总件数 ' + d.totalPieces + '件', X_SPEC, y)
      ctx.textAlign = 'right'
      ctx.fillText('¥' + d.logisticsRule.pricePerPiece + '/件', X_SUB, y)
      y += 22

      ctx.textAlign = 'right'
      ctx.fillStyle = '#333'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText('运费 ¥' + d.logisticsFreight, X_SUB, y)
      y += 24

      ctx.font = 'bold 16px sans-serif'
      ctx.fillStyle = '#2563EB'
      ctx.fillText('总价（含税） ¥' + d.logisticsTotal, X_SUB, y)
      y += 26

      ctx.fillStyle = '#86868B'
      ctx.font = 'bold 13px sans-serif'
      ctx.fillText('不含税 ¥' + d.logisticsTotalNoTax, X_SUB, y)
      y += 28
    } else {
      ctx.font = '13px sans-serif'
      ctx.fillStyle = '#86868B'
      ctx.textAlign = 'center'
      ctx.fillText('暂未配置', CANVAS_W / 2, y)
      y += 24
    }

    y = this.drawSep(ctx, y, '#E5E7EB')

    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#86868B'
    ctx.textAlign = 'left'
    const disLabel = d.discount === 1 ? '客户折扣：无' : '客户折扣：' + d.discountDisplay + '折'
    ctx.fillText(disLabel, X_SPEC, y)
    y += 20

    ctx.fillText('收货地址：' + d.province + ' ' + d.city, X_SPEC, y)
    y += 30

    y = this.drawSep(ctx, y, '#E5E7EB')

    ctx.fillStyle = '#86868B'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    const today = new Date()
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
    ctx.fillText('品质线槽，选择CNDES德赛', CANVAS_W / 2, y)
    ctx.fillText(dateStr, CANVAS_W / 2, y + 18)
  },

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
