const path = require('node:path')

function loadMiniProgramPage(relativePath, wxOverrides = {}) {
  const projectRoot = path.resolve(__dirname, '../..')
  const pagePath = path.join(projectRoot, relativePath)
  let definition = null

  global.getApp = () => ({ globalData: { isAdmin: false, quoteData: null } })
  global.wx = {
    showToast() {},
    showModal() {},
    getStorageSync() { return '' },
    setStorageSync() {},
    ...wxOverrides
  }
  global.Page = config => {
    definition = config
  }

  delete require.cache[require.resolve(pagePath)]
  require(pagePath)

  if (!definition) throw new Error(`Page definition not captured: ${relativePath}`)

  const page = {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(patch, callback) {
      Object.assign(this.data, patch)
      if (callback) callback()
    }
  }

  return page
}

module.exports = { loadMiniProgramPage }
