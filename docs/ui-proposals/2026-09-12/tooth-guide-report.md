# “齿型怎么选”说明功能修改报告

日期：2026-09-14

开发基线：`918fe4d fix: exclude development files from mini program upload`

交付范围：提交并推送 GitHub；不执行微信体验版覆盖

## 1. 修改页面

只修改报价页 `pages/quote/quote`。没有修改报价确认页、申请页、后台页、协议页或其他页面。

## 2. 修改与新增文件

运行代码和资源：

- `pages/quote/quote.js`
- `pages/quote/quote.wxml`
- `pages/quote/quote.wxss`
- `data/toothTypeGuide.js`
- `assets/tooth-types/coarse.png`
- `assets/tooth-types/fine.png`
- `assets/tooth-types/closed-slot.png`
- `assets/tooth-types/solid.png`

验证与项目记录：

- `tests/toothTypeGuide.test.js`
- `docs/ui-proposals/2026-09-12/tooth-guide-report.md`
- `PREFERENCES.md`

根目录原有未跟踪 JPG、预览素材、旧方案文件和 `tmp_quote_preview.py` 均保留原状，没有纳入或改写。

## 3. 四张图片的位置与对应关系

- `coarse.png`：开口（粗齿）
- `fine.png`：细齿
- `closed-slot.png`：封口
- `solid.png`：全封闭

目标文件与用户提供的四张源图 SHA-256 一致，属于逐字节复制。源图实际尺寸均为 220×166 px，不是说明文字中写的 300×200 px；程序按真实文件处理。WXML 使用 `mode="widthFix"`，WXSS 使用 `width: 100%; height: auto`，没有裁切、拉伸或改图。

## 4. 新增 UI 功能

- 在“齿形”标题右侧增加与“尺寸怎么看 ›”一致的“齿型怎么选 ›”入口。
- 点击后打开约占屏幕 82% 高度的 Bottom Sheet，遮罩点击和右上角按钮均可关闭。
- 内容区内部滚动，主报价页仍保持简洁。
- 每张卡片显示原图、齿型名称、1–2 行说明和当前高度对应参数。
- 未选择完整规格时展示四种通用说明，不显示具体 Q/P。
- 选择完整规格后只显示该规格实际支持的齿型。
- 全封闭不显示 Q/P；参数缺失时显示“详细孔位参数请咨询业务人员”。

## 5. 如何读取当前规格

点击入口时只读取报价页已有的 `sampleSpec`、`selectedHeight` 和 `selectedWidth`。只有 `sampleSpec` 已形成且能在现有 `products` 中找到完全相同的高、宽记录，才视为已选择完整规格。弹层显示顺序固定为“高 × 宽”，例如“高 40 × 宽 40 mm”。

## 6. 如何判断当前规格支持哪些齿型

先用现有 `products` 按 `specHeight` 和 `specWidth` 精确查找产品，再原样读取该产品的 `availableTeeth`。说明参数表不参与产品有效性判断，也不会给产品增加齿型。

模拟器检查：

- 40×40 的原产品数据支持粗齿、细齿、封口、全封闭，弹层显示四种。
- 20×15 的原产品数据只支持细齿、全封闭，弹层也只显示这两种，没有因参数表存在而增加粗齿或封口。

## 7. Q/P 如何按高度查询

参数集中在 `data/toothTypeGuide.js`，只供说明 UI 使用：

- 粗齿：高 20–30 → 出线孔 4 mm、齿宽 6 mm；高 35–65 → 6/8；高 80 → 8/10；高 100 → 10/12。
- 细齿：所有有效高度均为 4/6。
- 封口：高 30–40 → 6/6；高 50–65 → 8/10；高 80–100 → 10/12。
- 全封闭：侧面无出线孔，不返回、不显示 Q/P。

查询只使用当前高度，不使用宽度。没有匹配高度时返回缺失状态、显示咨询提示并输出 console 警告，不取邻近高度。

## 8. 业务与隐私文件确认

- `data/products.js`：未修改。
- `data/freightRules.js`：未修改。
- `data/logisticsRules.js`：未修改。
- `app.js` 及隐私授权相关页面：未修改。
- 云函数：未修改。
- 产品价格、可选规格、可选齿型、数量、米数、根数、箱数、重量、折扣、税费、运费、标准报价、定长报价、FOB 报价、报价图片与报价结果函数：未修改。

`quote.js` 只新增四个 UI 状态、打开/关闭 Bottom Sheet 的 UI 方法，以及读取 `products.availableTeeth` 后生成说明卡片的调用。原 43 个页面业务方法及其实现保持原样。

本次没有新发现需要登记的业务问题，因此未向 `ui-refactor-notes.md` 增加条目；已有历史问题保持原记录，本轮没有顺手修改。

## 9. 报价与模式回归

`node --test tests/*.test.js`：80/80 通过。

其中包括：

- 17 组冻结报价场景全部一致。
- 标准、定长、FOB 三种模式全部通过。
- 66 个规格在三种模式下的规格搜索与原手动选品结果一致。
- 指定示例继续为产品折后 ¥1,056.44、物流自提 ¥30.00、含税含运费 ¥1,086.44。
- 产品小计、折后金额、未税金额、重量、件数、快运/物流运费及各总价保持冻结基线结果。
- 打开、关闭齿型说明后，当前规格、齿型、颜色、数量、清单及所有价格状态不变。

## 10. 隐私授权回归

16 条隐私模拟分支全部通过，包括首次进入、已授权再次进入、拒绝授权、完成授权、旧接口兼容、协议打开成功/失败等。隐私代码没有修改。

## 11. UI、参数与包体验证

- 粗齿高度 40：6/8，通过。
- 粗齿高度 60：6/8，通过。
- 粗齿高度 80：8/10，通过。
- 粗齿高度 100：10/12，通过。
- 细齿高度 20、35、60、80、100：均为 4/6，通过。
- 封口高度 45：不套相近值，显示缺失提示，通过。
- 未选规格：四张说明卡正常打开且不显示 Q/P，通过。
- 微信开发者工具 iPhone 12/13 模拟器：入口、弹层、图片、内部滚动、关闭、40×40 和 20×15 均已目视通过。
- 微信原生编译器：5 个 WXML、6 个 WXSS 编译通过；JS 语法、JSON 和事件绑定检查通过。
- 按现有 `packOptions.ignore` 逐文件估算上传源为 44 个文件、365.7 KiB，低于 2 MB 主包上限。

开发者工具控制台仍有其原有 `timeout`、SharedArrayBuffer 和 HarmonyOS 提示；本次没有修改业务或系统设置去处理这些旧提示。

## 12. 所有 JavaScript 修改原因

- `pages/quote/quote.js`：新增说明弹层的 UI 状态和打开/关闭事件；读取现有完整规格及 `products.availableTeeth`，调用说明查询函数。没有改原选择或计算方法。
- `data/toothTypeGuide.js`：新增齿型名称、图片、短说明和按高度查询 Q/P 的独立 UI 配置；不被报价、价格或产品有效性判断使用。
- `tests/toothTypeGuide.test.js`：验证参数表、图片尺寸与比例、未选规格、现有产品齿型约束，以及弹层打开/关闭不改变业务状态。

## Git 差异

当前已跟踪运行文件的 `git diff --stat`：

```text
pages/quote/quote.js   | 25 +++++++++++++++++++++++++
pages/quote/quote.wxml | 31 +++++++++++++++++++++++++++----
pages/quote/quote.wxss | 23 ++++++++++++++++++++++-
3 files changed, 74 insertions(+), 5 deletions(-)
```

此外有 7 个本次新增的未跟踪运行/测试文件：四张 PNG、`data/toothTypeGuide.js`、`tests/toothTypeGuide.test.js` 和本报告。`PREFERENCES.md`、本报告位于上传忽略范围，不影响小程序包体运行逻辑。

## 结论

本次修改只影响“齿型怎么选”的说明 UI、说明数据和对应静态图片。产品真实可选齿型仍由原 `products` 决定；报价结果与修改前冻结基线完全一致。本交付提交不包含微信体验版上传或覆盖操作。
