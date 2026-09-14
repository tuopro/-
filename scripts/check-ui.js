const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { loadPage } = require('../tests/helpers/uiRegressionHarness')
const root = path.resolve(__dirname, '..')
const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
const pages = config.pages
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
for (const file of files.filter(file => file.endsWith('.json'))) JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
for (const file of [...files.filter(file => file.endsWith('.js')), 'utils/specSearch.js'].filter(file => fs.existsSync(path.join(root, file)))) {
  execFileSync(process.execPath, ['--check', path.join(root, file)])
}
for (const page of ['pages/quote/quote', 'pages/quoteResult/quoteResult']) {
  const definition = loadPage(page + '.js').definition
  const wxml = fs.readFileSync(path.join(root, page + '.wxml'), 'utf8')
  for (const match of wxml.matchAll(/(?:bind|catch):?[\w-]+="([A-Za-z_$][\w$]*)"/g)) {
    if (typeof definition[match[1]] !== 'function') throw new Error(`Unbound event: ${page} -> ${match[1]}`)
  }
}
async function main() {
  const compilerPath = process.env.WECHAT_WCC_PATH || '/Applications/wechatwebdevtools.app/Contents/Resources/package.nw/node_modules/wcc'
  if (!fs.existsSync(compilerPath)) throw new Error('WeChat WXML/WXSS compiler unavailable; set WECHAT_WCC_PATH')
  const { wcc, wcsc } = require(compilerPath)
  const wxml = await wcc({ cwd: root, files: pages.map(page => page + '.wxml') })
  const wxss = await wcsc({ cwd: root, files: [...pages.map(page => page + '.wxss'), 'app.wxss'], pageCount: pages.length })
  if (!wxml || !wxss) throw new Error('Empty compiler output')
  require('./check-ui-display').checkDisplay(wxml)
  console.log(`PASS: JS syntax, JSON, event bindings, ${pages.length} WXML pages and ${pages.length + 1} WXSS files compiled with WeChat compiler`)
}
main().catch(err => { console.error(err); process.exitCode = 1 })
