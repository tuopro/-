// ==================== app.js ====================
// 小程序入口，初始化云开发环境 + 全局数据传递
App({
  onLaunch() {
    // ★★★ 请替换为你的云开发环境 ID ★★★
    wx.cloud.init({ env: 'cloud1-d3gmvskwp0ac08074' })

    this.checkUserStatus()
  },

  checkUserStatus() {
    wx.cloud.callFunction({
      name: 'getOpenid'
    }).then(res => {
      const openid = res.result.openid
      const db = wx.cloud.database()
      return db.collection('users').where({ _openid: openid }).get()
    }).then(dbRes => {
      if (dbRes.data && dbRes.data.length > 0) {
        const user = dbRes.data[0]
        this.globalData.role = user.role || 'user'
        this.globalData.isAdmin = user.role === 'admin'

        if (user.status === 'approved') {
          setTimeout(() => {
            wx.redirectTo({ url: '/pages/quote/quote' })
          }, 50)
        } else if (user.status === 'pending') {
          setTimeout(() => {
            wx.redirectTo({ url: '/pages/pending/pending' })
          }, 50)
        } else if (user.status === 'rejected') {
          setTimeout(() => {
            wx.showModal({
              title: '提示',
              content: '您的申请已被拒绝',
              showCancel: false,
              success: () => {
                wx.redirectTo({ url: '/pages/apply/apply' })
              }
            })
          }, 50)
        }
        // 已 approved 已处理，待审核状态跳 pending，被拒绝则提示并跳 apply
      }
      // 无记录则留在 apply 页（默认为首页）
    }).catch(err => {
      console.error('checkUserStatus 失败', err)
    })
  },

  globalData: {
    quoteData: null,
    role: 'user',
    isAdmin: false
  },

  // ==================== 省份名称匹配工具 ====================
  matchProvince(dbProvinceList, pickerProvince) {
    // 1. 精确匹配
    if (dbProvinceList.includes(pickerProvince)) {
      return pickerProvince
    }

    // 2. 去掉 "省"/"市"/"自治区" 后缀再匹配
    const short = pickerProvince.replace(/(省|市|自治区)$/, '')
    const shortMatch = dbProvinceList.find(p =>
      p.replace(/(省|市|自治区)$/, '') === short
    )
    if (shortMatch) return shortMatch

    // 3. 特殊映射表
    const specialMap = {
      '广西壮族自治区': '广西',
      '内蒙古自治区':   '内蒙古',
      '西藏自治区':     '西藏',
      '宁夏回族自治区': '宁夏',
      '新疆维吾尔自治区': '新疆',
      '香港特别行政区': '香港',
      '澳门特别行政区': '澳门'
    }
    const mapped = specialMap[pickerProvince]
    if (mapped && dbProvinceList.includes(mapped)) return mapped

    // 4. 模糊匹配兜底
    const fuzzy = dbProvinceList.find(p =>
      p.includes(short) || short.includes(p)
    )
    if (fuzzy) return fuzzy

    return null
  }
})
