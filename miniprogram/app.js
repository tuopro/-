// ==================== app.js ====================
// 小程序入口，初始化云开发环境 + 全局数据传递
App({
  onLaunch() {
    // ★★★ 请替换为你的云开发环境 ID ★★★
    wx.cloud.init({ env: 'cloud1-d3gmvskwp0ac08074' })

    // 已验证过口令 → 下次直接进报价页
    if (wx.getStorageSync('quote_verified')) {
      // 延迟跳转，等页面栈初始化
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/quote/quote' })
      }, 50)
    }
  },

  globalData: {
    // 报价数据临时存储（eventChannel 优先，此字段作为备用）
    quoteData: null
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
