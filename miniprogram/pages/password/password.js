// ==================== pages/password/password.js ====================
const app = getApp()

Page({
  data: {
    password: '',
    showPassword: false,
    loading: false
  },

  onLoad() {
    // 如果已经验证过，直接跳走
    if (wx.getStorageSync('quote_verified')) {
      wx.redirectTo({ url: '/pages/quote/quote' })
    }
  },

  onInput(e) {
    this.setData({ password: e.detail.value })
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  onSubmit() {
    const input = this.data.password.trim()
    if (!input) {
      wx.showToast({ title: '请输入口令', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    wx.cloud.database().collection('appConfig')
      .where({ key: 'quotePassword' })
      .get()
      .then(res => {
        this.setData({ loading: false })
        const record = res.data && res.data[0]
        if (!record || record.value !== input) {
          wx.showToast({ title: '口令错误，请联系业务员获取', icon: 'none' })
          return
        }
        // 验证成功 → 存标记 → 跳转首页
        wx.setStorageSync('quote_verified', true)
        wx.redirectTo({ url: '/pages/quote/quote' })
      })
      .catch(err => {
        this.setData({ loading: false })
        console.error('口令验证失败', err)
        wx.showToast({ title: '验证失败，请检查网络', icon: 'none' })
      })
  }
})
