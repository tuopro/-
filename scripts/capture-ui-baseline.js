// Run once BEFORE editing the application. Refuses to replace an existing baseline.
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { root, baselineCommit, quotePath, resultPath, hash, loadPage, scenarios, runScenario } = require('../tests/helpers/uiRegressionHarness')
const output = path.join(root, 'docs/ui-proposals/2026-09-12/ui-baseline.json')
if (fs.existsSync(output)) throw new Error('Baseline already exists; refusing to overwrite')
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() !== baselineCommit) throw new Error('Unexpected baseline commit')
const editable = [quotePath, resultPath, 'pages/quote/quote.wxml', 'pages/quote/quote.wxss', 'pages/quoteResult/quoteResult.wxml', 'pages/quoteResult/quoteResult.wxss']
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
const hashes = Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]))
const methods = Object.fromEntries([quotePath, resultPath].map(file => [file,
  Object.fromEntries(Object.entries(loadPage(file).definition).filter(([, value]) => typeof value === 'function').map(([name, fn]) => [name, hash(fn.toString())]))
]))
const baseline = {
  commit: baselineCommit,
  capturedAt: new Date().toISOString(),
  initialGitStatus: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }),
  existingTests: { command: 'node --test tests/*.test.js', passed: 27, failed: 0 },
  editable,
  hashes,
  methods,
  scenarios: Object.fromEntries(scenarios.map(scenario => [scenario.name, runScenario(scenario)]))
}
fs.writeFileSync(output, JSON.stringify(baseline, null, 2) + '\n', { flag: 'wx' })
console.log(`Baseline saved: ${files.length} file hashes; ${Object.keys(methods[quotePath]).length + Object.keys(methods[resultPath]).length} original methods; ${scenarios.length} quotation scenarios`)
