const db = wx.cloud.database()

Page({
  data: {
    companyName: '',
    contactName: '',
    phone: '',
    remark: '',
    submitting: false,
    showPrivacy: false,
    privacyChecked: false,
    serviceAgreement: '《CNDES德赛线槽快速报价微信小程序用户服务协议》\n\n生效日期：2026年5月18日\n\n欢迎使用 CNDES德赛线槽快速报价 微信小程序（以下简称"本小程序"）。\n\n一、服务内容\n本小程序为用户提供线槽产品的规格选择、在线报价生成及业务咨询等服务。\n\n二、用户行为规范\n您在使用本小程序时，承诺遵守中华人民共和国相关法律法规，不利用本服务从事违法活动。\n\n三、个人信息保护\n我们将依据《隐私政策》收集和使用您的个人信息，以保障服务的正常运行。我们承诺对您的信息严格保密。\n\n四、免责声明\n因不可抗力或第三方原因导致的服务中断，我们不承担责任。\n\n五、联系我们\n如有疑问，请联系：郑晓拓，18267876677。',
    privacyPolicy: '《CNDES德赛线槽快速报价微信小程序隐私政策》\n\n生效日期：2026年5月18日\n\n我们深知个人信息对您的重要性。本政策将说明我们如何收集、使用和保护您的信息。\n\n一、我们收集的信息\n为生成报价和提供业务咨询，我们需要收集：\n- 公司名称：用于生成正式的报价单抬头。\n- 联系人姓名：用于在报价与业务沟通中辨识您的身份。\n- 手机号码：用于向您反馈报价结果及后续的必要业务联系。\n\n二、我们如何使用信息\n- 生成并向您展示产品报价单。\n- 通过手机号与您联系，沟通业务详情。\n\n三、信息的存储与保护\n您的信息仅存储在微信云开发环境中，我们采用加密等安全措施保护您的信息。\n\n四、您的权利\n您有权联系我们查阅、更正或删除您的个人信息。\n\n五、联系我们\n如对本政策有任何疑问，请联系：郑晓拓，18267876677。'
  },

  onLoad() {
    this.checkExisting()
  },

  checkExisting() {
    wx.cloud.callFunction({
      name: 'getOpenid'
    }).then(res => {
      const openid = res.result.openid
      db.collection('users').where({ _openid: openid }).get().then(dbRes => {
        if (dbRes.data && dbRes.data.length > 0) {
          const user = dbRes.data[0]
          if (user.status === 'approved') {
            wx.redirectTo({ url: '/pages/quote/quote' })
          } else if (user.status === 'pending') {
            wx.redirectTo({ url: '/pages/pending/pending' })
          } else if (user.status === 'rejected') {
            wx.showModal({
              title: '提示',
              content: '您的申请已被拒绝',
              showCancel: false
            })
          }
        }
      }).catch(err => {
        console.error('查询用户记录失败', err)
      })
    }).catch(err => {
      console.error('获取openid失败', err)
    })
  },

  onCompanyInput(e) {
    this.setData({ companyName: e.detail.value })
  },

  onContactInput(e) {
    this.setData({ contactName: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  noop() {},

  onSubmit() {
    const { companyName, contactName, phone, submitting } = this.data
    if (submitting) return

    if (!companyName.trim()) {
      wx.showToast({ title: '请输入公司名称', icon: 'none' })
      return
    }
    if (!contactName.trim()) {
      wx.showToast({ title: '请输入联系人', icon: 'none' })
      return
    }
    if (!phone.trim()) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(phone.trim())) {
      wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
      return
    }

    if (wx.getStorageSync('privacy_agreed')) {
      this.doSubmit()
    } else {
      this.setData({ showPrivacy: true, privacyChecked: false })
    }
  },

  doSubmit() {
    const { companyName, contactName, phone, remark } = this.data

    this.setData({ submitting: true })

    db.collection('users').add({
      data: {
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        remark: remark.trim(),
        status: 'pending',
        role: 'user',
        createTime: db.serverDate()
      }
    }).then(() => {
      this.setData({ submitting: false })
      wx.redirectTo({ url: '/pages/pending/pending' })
    }).catch(err => {
      this.setData({ submitting: false })
      console.error('提交申请失败', err)
      const errMsg = (err && err.errMsg) ? err.errMsg : ''
      if (errMsg.indexOf('callFunction') > -1) {
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      } else if (errMsg.indexOf('collection not exists') > -1 || errMsg.indexOf('-502001') > -1) {
        wx.showModal({
          title: '数据库未就绪',
          content: '请在云开发控制台 → 数据库 → 手动创建集合 "users"，权限设为"仅创建者可读写"',
          showCancel: false
        })
      } else if (errMsg.indexOf('-502002') > -1 || errMsg.indexOf('permission') > -1) {
        wx.showModal({
          title: '权限错误',
          content: '请在云开发控制台 → 数据库 → users集合 → 权限设置，选择"仅创建者可读写"',
          showCancel: false
        })
      } else {
        wx.showModal({
          title: '提交失败',
          content: errMsg || '未知错误，请重试',
          showCancel: false
        })
      }
    })
  },

  onAgreeCheck() {
    this.setData({ privacyChecked: !this.data.privacyChecked })
  },

  showServiceAgreement() {
    wx.showModal({
      title: '用户服务协议',
      content: this.data.serviceAgreement,
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  showPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: this.data.privacyPolicy,
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  onPrivacyConfirm() {
    if (!this.data.privacyChecked) return
    wx.setStorageSync('privacy_agreed', true)
    this.setData({ showPrivacy: false })
    this.doSubmit()
  }
})
