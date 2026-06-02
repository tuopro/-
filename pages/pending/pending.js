const db = wx.cloud.database()

Page({
  data: {
    checking: false
  },

  onShow() {
    this.checkStatus()
  },

  onRefresh() {
    this.setData({ checking: true })
    this.checkStatus()
  },

  checkStatus() {
    wx.cloud.callFunction({
      name: 'getOpenid'
    }).then(res => {
      const openid = res.result.openid
      return db.collection('users').where({ _openid: openid }).get()
    }).then(dbRes => {
      this.setData({ checking: false })
      if (dbRes.data && dbRes.data.length > 0) {
        const user = dbRes.data[0]
        if (user.status === 'approved') {
          wx.redirectTo({ url: '/pages/quote/quote' })
        } else if (user.status === 'rejected') {
          wx.showModal({
            title: '提示',
            content: '您的申请已被拒绝',
            showCancel: false,
            success: () => {
              wx.redirectTo({ url: '/pages/apply/apply' })
            }
          })
        }
      } else {
        wx.redirectTo({ url: '/pages/apply/apply' })
      }
    }).catch(err => {
      this.setData({ checking: false })
      console.error('检查状态失败', err)
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    })
  }
})
