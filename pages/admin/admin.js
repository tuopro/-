const db = wx.cloud.database()

Page({
  data: {
    list: [],
    totalCount: 0,
    loading: true
  },

  onLoad() {
    this.checkAdmin()
  },

  onShow() {
    this.checkAdmin()
  },

  checkAdmin() {
    wx.cloud.callFunction({
      name: 'getOpenid'
    }).then(res => {
      const openid = res.result.openid
      return db.collection('users').where({ _openid: openid }).get()
    }).then(dbRes => {
      if (dbRes.data && dbRes.data.length > 0) {
        const user = dbRes.data[0]
        if (user.role !== 'admin') {
          wx.showModal({
            title: '提示',
            content: '无权访问管理后台',
            showCancel: false,
            success: () => {
              wx.redirectTo({ url: '/pages/quote/quote' })
            }
          })
          return
        }
        this.loadList()
      } else {
        wx.showModal({
          title: '提示',
          content: '无权访问管理后台',
          showCancel: false,
          success: () => {
            wx.redirectTo({ url: '/pages/quote/quote' })
          }
        })
      }
    }).catch(err => {
      console.error('校验管理员失败', err)
      wx.showToast({ title: '网络错误', icon: 'none' })
    })
  },

  loadList() {
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'getAllUsers'
    }).then(res => {
      const result = res.result
      if (result.code !== 0) {
        this.setData({ loading: false })
        console.error('加载申请列表失败', result.errMsg)
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
        return
      }
      const list = (result.data || []).map(item => {
        let createTimeText = ''
        if (item.createTime) {
          const d = new Date(item.createTime)
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          const h = String(d.getHours()).padStart(2, '0')
          const min = String(d.getMinutes()).padStart(2, '0')
          createTimeText = y + '-' + m + '-' + day + ' ' + h + ':' + min
        }
        return {
          ...item,
          createTimeText
        }
      })
      this.setData({
        list,
        totalCount: list.length,
        loading: false
      })
    }).catch(err => {
      this.setData({ loading: false })
      console.error('加载申请列表失败', err)
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
    })
  },

  onRefresh() {
    this.loadList()
  },

  onApprove(e) {
    const id = e.currentTarget.dataset.id
    wx.cloud.callFunction({
      name: 'updateUserStatus',
      data: { id, status: 'approved' }
    }).then(res => {
      if (res.result.code !== 0) {
        wx.showToast({ title: '操作失败: ' + res.result.errMsg, icon: 'none' })
        return
      }
      wx.showToast({ title: '已通过', icon: 'success' })
      this.loadList()
    }).catch(err => {
      console.error('审批失败', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    })
  },

  onReject(e) {
    const id = e.currentTarget.dataset.id
    wx.cloud.callFunction({
      name: 'updateUserStatus',
      data: { id, status: 'rejected' }
    }).then(res => {
      if (res.result.code !== 0) {
        wx.showToast({ title: '操作失败: ' + res.result.errMsg, icon: 'none' })
        return
      }
      wx.showToast({ title: '已拒绝', icon: 'success' })
      this.loadList()
    }).catch(err => {
      console.error('审批失败', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    })
  }
})
