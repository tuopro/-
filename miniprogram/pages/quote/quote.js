// ==================== pages/quote/quote.js ====================
const app = getApp()

Page({
  data: {
    // --- 产品明细 ---
    productRows: [
      { id: 1, spec: '', unitPrice: 0, weight: 0, quantity: 1, pickerIndex: -1 }
    ],
    products: [],       // 云数据库原始数组 [{spec, unitPrice, weight}, ...]
    productRange: [],   // picker 显示用 [{label: "灰色20*15 ¥340"}, ...]
    rowIdCounter: 1,

    // --- 客户折扣 ---
    discountTypeIndex: 0,       // picker 索引：0→9.8折，1→无折扣，2→自定义
    discountOptions: [
      { label: '9.8折',     value: 0.98 },
      { label: '无折扣',    value: 1 },
      { label: '自定义折扣', value: -1 }
    ],
    discountInput: '',          // 用户输入的数值（例如 9.5）
    discountCoefficient: 0.98,  // 折扣系数，默认 9.8 折

    // --- 收货地址 ---
    province: '',
    city: '',
    region: [],

    // --- 含运费开关 ---
    includeFreight: true
  },

  onLoad() {
    this.loadProducts()
  },

  // ========== 加载产品列表（分页拉取全部）==========
  // ★ 前提：需在云开发控制台 → 数据库 → products → 索引管理 → 添加索引
  //    字段 _id，排序 升序。否则会全表扫描超时。
  loadProducts() {
    wx.showLoading({ title: '加载产品…' })
    const db = wx.cloud.database()
    const PAGE_SIZE = 20
    let allProducts = []

    const fetchNext = (skip) => {
      return db.collection('products')
        .field({ spec: true, unitPrice: true, weight: true, sort: true, desc: true })
        .orderBy('sort', 'asc')
        .skip(skip)
        .limit(PAGE_SIZE)
        .get()
        .then(res => {
          const data = res.data || []
          console.log(`[loadProducts] skip=${skip} 获取 ${data.length} 条`)
          allProducts = allProducts.concat(data)
          if (data.length >= PAGE_SIZE) {
            return fetchNext(skip + PAGE_SIZE)
          }
          return allProducts
        })
    }

    fetchNext(0)
      .then(products => {
        console.log(`[loadProducts] 总计: ${products.length} 条`)
        // 按 sort 字段排列（数据库已排好，不再用 spec 覆盖）
        const productRange = products.map(p => ({
          label: p.desc ? `${p.spec} ${p.desc}` : p.spec
        }))
        this.setData({ products, productRange })
      })
      .catch(err => {
        console.warn('产品加载超时（数据可能已到位）', err)
        // 如果 allProducts 已经有数据就不再弹 toast
        if (allProducts.length === 0) {
          wx.showToast({ title: '产品加载失败，请重试', icon: 'none' })
        }
      })
      .finally(() => wx.hideLoading())
  },

  // ========== 产品行操作 ==========

  // 添加一行
  addRow() {
    if (this.data.productRows.length >= 10) return
    const id = ++this.data.rowIdCounter
    const newRow = { id, spec: '', unitPrice: 0, weight: 0, quantity: 1, pickerIndex: -1 }
    this.setData({
      productRows: [...this.data.productRows, newRow],
      rowIdCounter: id
    })
  },

  // 删除一行（至少保留1行）
  removeRow(e) {
    const rowId = e.currentTarget.dataset.rowid
    const rows = this.data.productRows
    if (rows.length <= 1) return
    this.setData({
      productRows: rows.filter(r => r.id !== rowId)
    })
  },

  // 产品选择变更
  onProductChange(e) {
    const rowId = e.currentTarget.dataset.rowid
    const pickerIndex = parseInt(e.detail.value)
    const product = this.data.products[pickerIndex]
    if (!product) return

    const rows = this.data.productRows.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          pickerIndex,
          spec: product.spec,
          unitPrice: product.unitPrice,
          weight: product.weight
        }
      }
      return r
    })
    this.setData({ productRows: rows })
  },

  // 数量输入（blur 时才做最终修正）
  onQuantityInput(e) {
    // 暂不处理，在 blur 时统一修正
  },

  // 数量失焦修正：正整数，至少为 1
  onQuantityBlur(e) {
    const rowId = e.currentTarget.dataset.rowid
    const raw = parseInt(e.detail.value)
    if (isNaN(raw)) return
    const qty = Math.max(1, Math.floor(raw))
    const rows = this.data.productRows.map(r =>
      r.id === rowId ? { ...r, quantity: qty } : r
    )
    this.setData({ productRows: rows })
  },

  // ========== 客户折扣 ==========

  // 折扣类型切换
  onDiscountTypeChange(e) {
    const index = parseInt(e.detail.value)
    const option = this.data.discountOptions[index]
    if (option.value === -1) {
      // "自定义折扣"
      this.setData({
        discountTypeIndex: index,
        discountInput: '',
        discountCoefficient: 1
      })
    } else {
      // 9.8折 或 无折扣（预设系数）
      this.setData({
        discountTypeIndex: index,
        discountInput: '',
        discountCoefficient: option.value
      })
    }
  },

  // 自定义折扣输入失焦时计算系数
  // 公式：系数 = 输入值 / 10（"9.5" 表示 9.5折 → 系数 0.95）
  onDiscountBlur(e) {
    const raw = e.detail.value
    if (!raw || raw === '') {
      this.setData({ discountCoefficient: 1 })
      return
    }
    const val = parseFloat(raw)
    if (isNaN(val) || val <= 0 || val > 100) {
      wx.showToast({ title: '折扣需在 0~100 之间', icon: 'none' })
      this.setData({ discountInput: '', discountCoefficient: 1 })
      return
    }
    const coeff = parseFloat((val / 10).toFixed(4))
    this.setData({
      discountInput: raw,
      discountCoefficient: coeff
    })
  },

  // ========== 收货地址 ==========
  onRegionChange(e) {
    const [province, city] = e.detail.value
    this.setData({ province, city, region: e.detail.value })
  },

  // ========== 含运费开关 ==========
  onFreightSwitch(e) {
    this.setData({ includeFreight: e.detail.value })
  },

  // ========== 提交报价 ==========
  onSubmit() {
    // 1. 校验产品行
    for (const row of this.data.productRows) {
      if (!row.spec) {
        wx.showToast({ title: '请为每一行选择产品', icon: 'none' })
        return
      }
      if (!row.quantity || row.quantity < 1) {
        wx.showToast({ title: '数量必须大于 0', icon: 'none' })
        return
      }
    }

    // 2. 校验地址（仅含运费时）
    if (this.data.includeFreight && !this.data.province) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }

    // 3. 校验折扣
    const curOption = this.data.discountOptions[this.data.discountTypeIndex]
    let discount = this.data.discountCoefficient
    if (curOption && curOption.value === -1) {
      // 自定义折扣：必须有输入
      if (!this.data.discountInput || this.data.discountInput === '') {
        wx.showToast({ title: '请输入自定义折扣', icon: 'none' })
        return
      }
      if (discount <= 0 || discount > 10) {
        wx.showToast({ title: '折扣系数异常，请重新输入', icon: 'none' })
        return
      }
    }

    // 4. 组装数据
    const productList = this.data.productRows.map(r => ({
      spec: r.spec,
      unitPrice: r.unitPrice,
      weight: r.weight,
      quantity: r.quantity
    }))

    // 5. 跳转结果页 —— eventChannel 为主，globalData 为备
    wx.navigateTo({
      url: '/pages/quoteResult/quoteResult',
      success: res => {
        res.eventChannel.emit('quoteData', {
          productList,
          province: this.data.includeFreight ? this.data.province : '',
          city: this.data.includeFreight ? this.data.city : '',
          discount,
          includeFreight: this.data.includeFreight
        })
      },
      fail: err => {
        console.error('导航失败', err)
        app.globalData.quoteData = {
          productList,
          province: this.data.includeFreight ? this.data.province : '',
          city: this.data.includeFreight ? this.data.city : '',
          discount,
          includeFreight: this.data.includeFreight
        }
        wx.navigateTo({ url: '/pages/quoteResult/quoteResult' })
      }
    })
  }
})
