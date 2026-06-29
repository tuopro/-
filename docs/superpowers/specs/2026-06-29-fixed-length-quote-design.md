# 定长线槽报价功能设计

## 目标

在现有标准报价功能之外，增加一项“定长报价”模式，用于给非标长度线槽报价。用户选择规格后，只输入单根长度和数量，程序自动计算单根报价、产品合计、重量、快运费和总价。

该功能保留现有小程序的基础能力和视觉风格，不改动标准报价原有功能。

## 用户流程

1. 用户进入报价页。
2. 用户在顶部切换“标准报价 / 定长报价”。
3. 用户在定长报价模式下选择高度、宽度、齿形、颜色。
4. 用户输入单根长度，单位为米。
5. 用户输入数量，单位为根。
6. 用户点击“加入定长报价”。
7. 用户选择客户折扣，默认沿用标准报价的 9.8 折。
8. 用户选择是否含运费，默认含运费。
9. 若含运费，用户选择收货省市，系统按现有快运规则计算运费。
10. 用户查看报价结果，并生成完整报价单。

## 页面设计

报价页保留当前蓝白玻璃质感和 CNDES 德赛线槽品牌风格。

新增一个报价模式切换控件：

- 标准报价
- 定长报价

定长报价模式显示以下模块：

- 规格选择：复用现有高度、宽度、齿形、颜色选择逻辑。
- 定长输入：只展示“单根长度”和“需要数量”两个输入项。
- 客户折扣：复用标准报价的折扣选择和自定义折扣。
- 含运费：复用标准报价的含运费开关，默认打开。
- 收货地址：仅在含运费打开时展示，用户通过省市选择器输入。
- 报价结果：始终展示单根报价、数量、产品合计、单根重量、总重量；仅在含运费打开且已选择地址后展示快运费和含快运总价。

前台不展示切割公式和中间计算过程，避免界面复杂。计算过程只在程序内部执行。

## 价格计算

定长报价复用现有产品表中的单米价格。

输入：

- `meterPrice`：所选规格的单米价格。
- `lengthM`：用户输入的单根长度，单位米。
- `quantity`：用户输入的数量，单位根。
- `cuttingRate`：切割加价系数，固定为 `1.2`。

限制：

- `lengthM > 0`
- `lengthM <= 2`
- `quantity` 必须为正整数。
- `floor(2 / lengthM)` 必须大于等于 `1`。

计算：

```text
twoMeterCutPrice = meterPrice * 2 * cuttingRate
piecesPerTwoMeter = floor(2 / lengthM)
fixedUnitPrice = twoMeterCutPrice / piecesPerTwoMeter
productTotal = fixedUnitPrice * quantity
```

示例：

```text
规格：40×40 粗齿 灰色
单米价格：4.8 元/米
单根长度：0.6 米
数量：100 根

twoMeterCutPrice = 4.8 * 2 * 1.2 = 11.52
piecesPerTwoMeter = floor(2 / 0.6) = 3
fixedUnitPrice = 11.52 / 3 = 3.84 元/根
productTotal = 3.84 * 100 = 384 元
```

## 重量计算

定长报价复用现有产品表中的重量数据。

普通齿形重量：

```text
weightPerMeter = boxWeight / boxMeters
```

全封闭重量：

```text
weightPerMeter = boxWeightFullSeal / boxMeters
```

若某个产品没有 `boxWeightFullSeal`，则回退使用 `boxWeight`。

计算：

```text
weightPerPiece = weightPerMeter * lengthM
totalWeight = weightPerPiece * quantity
```

示例：

```text
40×40 粗齿 灰色
boxWeight = 42kg
boxMeters = 100m
weightPerMeter = 42 / 100 = 0.42kg/m

weightPerPiece = 0.42 * 0.6 = 0.252kg
totalWeight = 0.252 * 100 = 25.2kg
```

## 折扣与税额

定长报价保留标准报价的客户折扣逻辑。

默认折扣：

```text
discountCoefficient = 0.98
```

折后产品价：

```text
discountedTotal = productTotal * discountCoefficient
```

不含税产品价：

```text
noTaxTotal = discountedTotal / 1.1
```

若用户选择无折扣，则 `discountCoefficient = 1`。

若用户选择自定义折扣，则沿用标准报价的输入校验规则。

## 运费计算

定长报价只提供快运，不提供物流自提。

含运费默认打开。

若含运费打开：

- 用户必须选择收货省市。
- 程序复用现有快运规则表 `freightRules`。
- 只按省份匹配快运规则。
- 未选择收货省市前，不展示快运费和含快运总价，只提示用户选择地址。

计算：

```text
weightFee = totalWeight * pricePerKg
expressFreight = max(startPrice, weightFee)
expressTotal = discountedTotal + expressFreight
expressTotalNoTax = noTaxTotal + expressFreight
```

示例：

```text
江苏省 startPrice = 35
江苏省 pricePerKg = 0.7
totalWeight = 25.2kg

weightFee = 25.2 * 0.7 = 17.64
expressFreight = 35
```

若含运费关闭：

- 不要求收货地址。
- 不展示快运卡片。
- 底部总价显示折后产品价。

## 报价单

定长报价生成报价单时，应清楚标明这是定长报价。

报价单产品行建议展示：

- 规格
- 单根长度
- 单根价格
- 数量
- 产品小计

报价单汇总展示：

- 产品原价合计
- 产品折后合计
- 产品不含税总价
- 总重量
- 快运费
- 总价含税
- 总价不含税
- 收货地址，若含运费打开

复制文本和生成图片都应支持定长报价。

## 错误处理

应提示以下错误：

- 未选择完整规格：提示“请选择规格”。
- 未选择齿形：提示“请选择齿形”。
- 单根长度为空或小于等于 0：提示“请输入单根长度”。
- 单根长度大于 2 米：提示“单根长度不能超过 2米”。
- 数量为空、不是整数或小于等于 0：提示“请输入正确数量”。
- 含运费打开但未选择地址：提示“请选择收货地址”。
- 当前省份没有快运规则：提示“当前地区暂未配置快运费”。

## 实现边界

本次只新增定长报价功能，不改变标准报价的原有计算逻辑。

不新增后台管理页面，不新增价格表维护入口。

切割加价系数 `1.2` 先作为前端常量实现，后续如果需要给管理员配置，再单独做管理功能。

## 验证场景

核心示例：

```text
规格：40×40 粗齿 灰色
单米价格：4.8
单根长度：0.6
数量：100
省份：江苏省
折扣：无折扣

单根报价：3.84
产品合计：384
总重量：25.2kg
快运费：35
含快运总价：419
```

折扣示例：

```text
产品合计：384
折扣：9.8折
折后产品价：376.32
江苏快运费：35
含快运总价：411.32
```

边界示例：

```text
lengthM = 2
piecesPerTwoMeter = 1
fixedUnitPrice = meterPrice * 2 * 1.2
```

```text
lengthM = 2.1
提示：单根长度不能超过 2米
```
