# 蓝色方案 A 优化版生图记录

使用内置 image_gen；主图参考原方案 A 和 B，搜索细节图参考原方案 A。图片为新的方案参考，原图保留。

## 主流程参考图

Use case: ui-mockup. Generate a NEW refined design presentation for the user's CNDES 德赛 PVC wiring duct quotation WeChat mini-program.
Input images: reference 1 scheme-a.png is the PRIMARY reference for visual language, layout and fast quotation flow; reference 2 scheme-b.png is a SECONDARY reference ONLY for clear dimension labels, explicit delivery explanations, and review hierarchy. The user explicitly selected A, wants to KEEP specification SEARCH and wants BLUE throughout. Do not carry over the teal green or numbered step wizard from B.
Deliver one very crisp high-fidelity landscape board with THREE large mobile UI screens in a row, straight-on flat mobile frame silhouettes. Board approximately 3:2 aspect. Large readable Chinese text, realistic WeChat UI size hierarchy, sufficient safe area and nothing cropped. Refined shippable design review, not wireframe. Same blue family across all screens: primary #1559C9, navy #14263D, body white and pale cool-gray #F4F6F9, blue-tinted selected panels #EDF4FF. Small header, modest 12px radii, shallow shadows, plenty of breathing room in rows but efficient overall height. No green, purple, glass, decorative imagery, charts, product diagrams, ecommerce checkout or fake analytics.
Board title "方案 A 优化版 · 蓝色高效报价台". Subtitle "保留规格搜索，让尺寸、配送和报价更清楚". Footer "交互概念参考 · 示例数据 · 尚未上线". Three captions "快速选品" / "清单与配送" / "报价确认".
LEFT screen:
Small WeChat status and top app header "CNDES 德赛" with "快速报价", top-right mini-program capsule. Mode segmented control: "标准报价" blue selected, "定长报价", "外贸 FOB".
Prominent full-width SEARCH input directly beneath modes: magnifier and placeholder "搜索规格：6040 / 60×40". This search is a PRIMARY permanent entry, do not omit or put below form. Small recent-use row "最近使用" with "40×40" and "60×40".
Full width stacked form, no split half-width panels. Heading "选择产品", small right "尺寸怎么看 ›". Field "高度 mm" right "全部 ›", buttons 30,40,50,60(selected blue),80. Field "宽度 mm" right "全部 ›", buttons 25,30,35,40(selected blue),45.
Distinct pale blue dimension summary strip EXACT "当前规格：高 60 × 宽 40 mm".
Field "齿形", buttons "粗齿"(blue selected), "细齿", "封口", "全封闭". Color inline "颜色：灰色".
Field "采购数量", numeric field value "100" suffix "米"; helper "100 米 / 箱 · 当前 1 箱".
Blue wide inline button "加入报价清单". Sticky bottom white dock: left "已选 1 项 · 100 米", right blue or outlined-blue "查看清单". This screen is BEFORE adding current 60x40; existing cart has 40x40. All safe in viewport.
MIDDLE screen:
Small status bar, navbar title "报价清单", back arrow left, "继续添加" right safely outside mini-program capsule. Compact "2 项产品 · 200 米".
Two efficient full-width editable line-item blocks:
"40×40 mm" with "粗齿 · 灰色", "编辑 ›"; quantity "100 米", price with label "原价小计 ¥480.00".
"60×40 mm" with "粗齿 · 灰色", "编辑 ›"; quantity "100 米", "原价小计 ¥598.00".
Compact settings rows "客户折扣" right "9.8 折 ›"; "配送地区" right "浙江省 杭州市 ›".
Section "配送方式": 3 STACKED single-selection radio rows:
"快运送货", secondary "送货上门", right "¥65.10", unselected.
"物流自提", secondary "到当地物流网点提货", right "¥30.00", SELECTED blue border, blue radio, pale blue fill.
"不计运费", secondary "报价不包含运输费用", unselected. This is NOT free shipping.
Small summary "产品折后 ¥1,056.44".
Bottom sticky dock: caption "含税含运费", big "¥1,086.44", button "预览报价". Keep middle screen readable, avoid redundant headings consuming height.
RIGHT screen:
Status bar, compact navbar "报价确认" with back arrow and mini-program capsule.
Simple brand "CNDES 德赛线槽", small "客户报价单".
Large pale-blue total panel: caption "报价合计（含税含运费）", oversized exact "¥1,086.44", below "不含税含运费 ¥990.40". No fake tax rate changes.
Below separate delivery summary row: "物流自提 · 浙江省 杭州市"; smaller helper "到当地物流网点提货"; clear blue "修改 ›".
Section title "产品明细" right "修改清单 ›". Two full width rows not cramped 6-column tables:
"40×40 mm · 粗齿 · 灰色" / "100 米" / "折后 ¥470.40".
"60×40 mm · 粗齿 · 灰色" / "100 米" / "折后 ¥586.04".
Thin rule, aligned rows "产品折后合计" with "¥1,056.44"; "物流自提运费" with "¥30.00".
Simple disclosure "查看计价明细 ›".
Bottom action region full-width blue "生成报价图片"; outlined "复制报价". Page chrome and action buttons distinct from quote content.
KEY constraints: all units and monetary numbers exact, dimensions always HEIGHT x WIDTH. The user asked for efficient flow plus helpful labels, not a rigid 1/2/3 wizard: NO numbered progress tracker and NO forced next-step button language. No cost formulas, internal implementation prose, fake customers, delivery guarantees, nonexistent navigation. No product photo necessary; this is a mobile utility form.

## 搜索功能细节图

Use case: ui-mockup. Create a NEW companion UI reference board explaining SPECIFICATION SEARCH for CNDES 德赛 quotation mini-program. Reference image scheme-a.png sets the blue business language. User explicitly wants BLUE, retains A workflow, adds explicit HEIGHT/WIDTH labels. Use blue #1559C9, navy #14263D, white, pale cool-gray #F4F6F9, selected pale blue. Absolutely no teal or green.
One polished landscape or near-square presentation with TWO large flat front-facing mobile screens with ample small external margin, very clear Chinese. Board title "规格搜索 · 输入数字就能找到". Subtitle "输入 6040 → 点选 60×40 → 选择齿形并填数量". Footer "交互概念参考 · 点击结果才选中 · 示例状态". Small screen captions "输入时：显示匹配结果" and "点选后：继续填写". Keep both screens same design family as reference, modest rounded corners, professional flat solid white body, blue actions. No 3D phones, diagrams, photos, teal, step progress bars or fake data.
LEFT SCREEN, search active, keyboard is visible and must NOT cover the result:
WeChat status/top compact app header "CNDES 德赛" and page title "快速报价", capsule right.
Modes "标准报价"(blue active), "定长报价", "外贸 FOB".
Full-width focused search field with blue outline, typed actual input "6040", small clear x; beside field small "取消". Below small text "匹配到 1 个规格".
ONE large tappable candidate card, in upper third of screen, exact:
bold "60×40 mm"
medium "高 60 × 宽 40"
small "粗齿 / 细齿 / 封口 / 全封闭"
right blue label "选择 ›"
Do not display price here, because tooth type has not been chosen. Small hint immediately below "按 高×宽 匹配，点选后再填数量".
Link "改用高度、宽度选择 ›".
Large calm empty area below because exactly one match, no invented repeated list entries. At bottom show a realistic soft Chinese/alphanumeric keyboard with a numeric entry row or number layer; main numeric keys visible 1-0. Search input supports paste of 60×40 or 60x40; do not label it numeric-only. A small keyboard accessory row may say "支持 6040、60×40、60x40". No sticky add-to-cart action while searching; no partial form overlap under keyboard.
RIGHT SCREEN, selected result and keyboard dismissed:
Same compact header and modes.
Search field unfocused placeholder "搜索规格：6040 / 60×40".
Below a small summary selection card bold "已选 60×40 mm", secondary "高 60 × 宽 40", blue text action "更换规格 ›". This compact chosen-spec state replaces expanded height/width options; tapping change restores manual selectors. No forced repeated selection.
Full-width stacked field area "选择齿形" with 2x2 options "粗齿" selected BLUE check, "细齿", "封口", "全封闭". Color inline "颜色：灰色".
Subtle unit price line "当前米价（折扣前）" value "¥5.98 / 米".
Label "采购数量", large numeric input "100" suffix "米", helper "100 米 / 箱 · 当前 1 箱".
Wide blue button "加入报价清单".
Small explanatory product-use note "加入后可继续搜索下一个规格".
Bottom fixed dock left "已选 1 项 · 100 米", right "查看清单" button. The current 60x40 is still awaiting addition, earlier cart has one item. This is intentional, do not auto increment until add action.
Do not add features such as AI recommendations, payment, certificates, prices for unsupported teeth, fake customer identities. State distinction: left typed query does not commit selection; right selected spec ready for choosing tooth and adding, not already added. Ensure unclipped readable content.
