# Glass：设计依据与实现映射

更新日期：2026-10-11。依据 Apple Human Interface Guidelines 当前版本（含 Liquid Glass 相关更新）。规格数值直接取自 HIG 页面数据（developer.apple.com 的 DocC JSON），没有凭印象手写。

## 依据的 HIG 页面

- [Color](https://developer.apple.com/design/human-interface-guidelines/color)：iOS 26 系统色（默认、提高对比度 × 浅色、深色）和系统灰。
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)：iOS Dynamic Type 默认档（Large）的各级字号、行高、字重，以及 SF Pro 字距表。
- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)：Liquid Glass 只用于浮在内容上方的导航和控件层，内容层不用；系统降低透明度、增强对比度时要做相应处理。
- [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) / [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)：iOS 标签栏浮在底部；iPadOS 标签栏在顶部，图标和文字并排；可以转换为侧边栏；避免溢出标签；优先用填充图标；搜索可以放在标签栏末端。
- [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)：大标题滚动后变为内联标题；使用标准返回按钮；工具栏按钮使用 Liquid Glass。
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)：点击区域至少 44×44 pt；一行内的按钮优先用胶囊形；主要操作使用强调色。
- [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)、[Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)、[Motion](https://developer.apple.com/design/human-interface-guidelines/motion)。

## 数值对照

| 项目 | 取值 | 来源 |
| --- | --- | --- |
| 系统蓝 | 浅色 rgb(0,136,255)，深色 rgb(0,145,255)；高对比度 rgb(30,110,244) / rgb(92,184,255) | HIG Color（iOS 26） |
| 其余系统色 | 红、橙、黄、绿、薄荷、青、蓝绿、靛、紫、粉、棕：同上四组 | HIG Color |
| 字号 | Large Title 34/41，Title 1 28/34，Title 2 22/28，Title 3 20/25，Headline 17/22 Semibold，Body 17/22，Callout 16/21，Subhead 15/20，Footnote 13/18，Caption 12/16、11/13 | HIG Typography：Large（默认） |
| 字距 | 34 pt +0.40，28 pt +0.38，22 pt −0.26，20 pt −0.45，17 pt −0.43，15 pt −0.23，13 pt −0.08 | HIG Typography：SF Pro 字距表 |
| 语义色 | label、secondaryLabel、各级 fill、background、separator | UIKit 语义色 |
| 点击区域 | 最小 44 CSS px | HIG Buttons |
| 动效 | SwiftUI 的 `.smooth`（bounce 0）、`.snappy`（0.15）、`.bouncy`（0.3），时长均为 0.5 s；页面 push/pop 用 0.35 s 的 smooth 弹簧（约 515 ms 停稳）。由 `tools/springs.mjs` 按弹簧公式采样成 CSS `linear()` | SwiftUI Spring(duration:bounce:) |

## 用到的外部库

| 用途 | 库 | 原因 |
| --- | --- | --- |
| 玻璃折射（非 Chromium） | `simple-liquid-glass` 5.4（MIT） | Safari、Firefox 不支持在 backdrop-filter 里用 SVG 滤镜，这些浏览器用这个库的 WebGL 折射，CSS 磨砂作为兜底。Chromium 上这个库的 SVG 路径只有单层位移、没有色散，所以改用主题自己的滤镜（见下文）。 |
| 图标 | `@iconify-json/f7` + `@iconify/utils`（MIT） | SF Symbols 的许可证只允许用在 Apple 平台的应用里，不能用于网页。Framework7 Icons 按 SF Symbols 风格绘制，命名也基本对应。 |
| 品牌图标 | `simple-icons`（CC0） | 社交链接的品牌标志，单色，用 currentColor 着色。 |
| 字体 | `@fontsource-variable/inter`（OFL） | SF Pro 不能随网页分发。苹果设备直接用系统字体；其他系统的拉丁字母用外观最接近的 Inter，中文用平台字体。苹果设备上不会下载 Inter。 |

## 页面决策

- 玻璃只用于标签栏、侧边栏、搜索按钮和工具栏的圆形按钮；正文、列表、卡片使用实色的系统背景和填充色。
- Chromium 上的玻璃（`scripts/optics.ts`）：
  - 每个玻璃表面按自身尺寸和圆角，在 canvas 上生成位移贴图。边缘一圈像凸面玻璃一样把背景向内弯折，最大约 10px；中间保持平直、清晰。
  - 色散：红、绿、蓝三个通道分开位移，蓝色弯折最多，再叠加回来。彩边宽度按像素限制在 2.5px 以内，只在弯折最大的边缘出现。
  - 只加 2.5px 模糊和少量饱和度，表面覆一层 20% 的白（深色为 20% 的深灰），比纯 CSS 磨砂通透；同时保证标签栏压在正文上时，背后的文字不会和标签文字抢。
  - 页面转场期间（约 0.5 秒），导航层只用普通模糊，不做折射，玻璃层自己的滤镜也关掉：否则页面在下面滑动时，每帧都要重算三次位移加一次模糊；而且转场快照本来就没有背景可以折射。
  - 视图转场名称（`view-transition-name`）会让元素成为背景根，里面的玻璃就采样不到页面，所以导航栏、标签栏、侧边栏只在转场期间才挂名字。
- 标签栏（`scripts/tab-bar.ts`）：
  - 选中块由弹簧驱动：移动时按速度沿运动方向拉长、竖向收窄，停下后用欠阻尼的弹簧回弹几下恢复原形。
  - 按住约 0.2 秒，或在栏上横向拖动，选中块会抬起成一块放大 1.3 倍的透明透镜，里面的内容放大约 1.1 倍并带细微色散。透镜略微滞后地跟着手指移动，到两端时最多越出栏边几个像素并回弹；松手后落到最近的标签上并打开它。
  - iPad 宽度下标签按文字宽度排布，只有空间不够时才压缩，"全部文章"不再被截断。
- 标签栏的选中块是一块更亮的透镜，用 snappy 弹簧在标签之间滑动。玻璃按钮被按下时会用 bouncy 弹簧放大，模拟 Liquid Glass 对直接触摸的较强反应。
- 页面切换：进入更深一层的页面用 push（新页从右侧推入，旧页左移 30% 并变暗），返回用 pop，点击标签栏或侧边栏切换栏目用淡入淡出。导航保持不动（Astro ClientRouter + `transition:persist`）。
  - 内容层是不透明的整页（从导航栏下方铺满窗口），推入的新页会完全盖住旧页；旧页压暗（浅色 brightness 0.86，深色 0.6）。宽屏下动画裁剪在内容区内，不会从侧边栏四周露出来。
  - 转场期间，标签栏、搜索按钮和侧边栏各自成为独立的转场层，层级最高，始终在页面之上，并显示实时状态（选中块照常滑动）。转场快照没有背景可以模糊，所以由转场层自己加玻璃模糊。导航栏的按钮和标题原地淡入淡出。
- 每页都有大标题，滚动到导航栏下方后，导航栏中央出现内联标题，同时显示滚动边缘效果（模糊加渐隐）。iPad 宽度下导航栏中央是标签栏，因此不显示内联标题。
- 首页参照 App Store 的 Today：上方小字标语，大标题，右上角头像；下面是精选卡片和分组列表。关于页参照通讯录名片。
- 文章页参照 Apple News 和 Safari 阅读模式：
  - 正文放在一张不透明的阅读页上（浅色白、深色 #1C1C1E），和灰色分组背景分开。手机上铺满全宽并从顶端开始，封面延伸到导航栏下面；iPad 和桌面上是 28px 圆角的卡片。
  - 头部只保留分类、标题、导语和一行署名（作者 · 日期 · 阅读时长）；标签、更新日期和字数放到文末。
  - 目录在 ≥1440 宽度下是阅读页右侧的吸顶面板，与阅读页顶端对齐；更窄时折叠在头部和正文之间。
  - 系列、上下篇和继续阅读放在阅读页下方的灰色背景上，宽度与阅读页一致。
- 中文长文的正文行高从 Body 的 22/17 提高到 1.8；字距表只用于界面文字，正文字距为 0。

## 换页性能（2026-10-11 排查）

用无头 Chrome 加 CPU profiler 在生产构建上测量，手机宽度：

- 点击文章后，Astro 替换页面用了 128–149ms，主要是新页面第一次布局（139ms）。原因不是页面结构，而是 Windows 上第一次用到某种字体（等宽代码字体、中文粗体和斜体、大标题字号）时，浏览器要同步查找回退字体。把内容克隆后重新插入只要 7ms，可以印证这一点。
  - 处理：`scripts/warmup.ts` 在浏览器空闲时，用文章页的真实样式类，分三次排一段隐藏的示例文字，提前把这些字体找好。之后替换页面降到 44–61ms，首次布局降到 47ms。
- 推入和返回时，新旧两页原本用的是浏览器给淡入淡出准备的默认 `plus-lighter` 叠加混合。不透明的页面互相叠在一起时，这会让重叠区域发亮、透出重影，每帧还多一次离屏合成。现在改为普通混合。
- 动画进行中，主线程每帧稳定在 16–17ms。真机 GPU 上的合成耗时无法在无头环境里测量。

## Web 适配说明

- 这是遵循 HIG 的网页实现，没有调用 SwiftUI/UIKit，无法复刻系统级的实时光学渲染、自动取色和触感反馈。
- 非 Chromium 浏览器上，WebGL 折射需要先为正文生成背景快照，长文章开销较大。加密文章和开启"减少动态效果"时不走这条路径，改用 CSS 模糊。
- CSS px 和 pt 按 1:1 对应，断点为网页宽度，不读取设备型号。

## 验证记录（2026-10-11，Core 0.4.1）

- 390 / 820 / 1440 宽度下逐项测量：
  - 底部标签栏、顶部标签栏、侧边栏的位置和尺寸都符合预期；
  - 选中块与选中标签完全对齐；
  - 首页、文章、归档、加密文章、关于、友链、404 在 390 宽度下都没有横向溢出。
- 客户端导航：
  - 标签切换判定为 fade，打开文章为 push，返回为 pop；
  - 导航元素在页面之间保持为同一个，选中状态跟着同步；
  - 返回按钮能回到来源页；滚动后内联标题出现。
- 深色模式下背景为 #000，分组表面为 #1C1C1E，强调色为深色版系统蓝。
- `npm run check` 0 错误；预览站点生产构建成功（38 页）；主题脚本 7.5KB，玻璃库按需加载，浏览器脚本中不含图标数据。
- 未在 iPhone、iPad 真机或 Safari 上验证；动画只确认了触发条件，没有逐帧观察。

## 运行时性能与兼容

本主题的客户端增强要求 Core ^0.4.2 / Theme API ^1.4.0。目录仅在文章页加载，日期格式化器按语言与时区有界复用，导航使用 Core 的部署 base 规则。

SVG 位移图保持原分辨率、边缘曲线和色散参数；只跳过平面中心的中性像素计算。贴图缓存采用最多 24 项、估算 8 MiB 的 LRU 预算（不是浏览器总内存上限），尺寸变化合并到帧队列，只为可见表面创建资源。同尺寸拖动镜片复用滤镜；拖动中复用布局几何，静止时停止动画帧。

非 Chromium 路径固定使用 simple-liquid-glass 5.4.0。局部 Web Component 子类通过公开生命周期回调，把尺寸/属性变化的重建合并到下一帧，避免组件在 ResizeObserver 通知中同步重建 WebGL。升级此依赖时需重新核对生命周期。页面切换前释放旧捕获，切换后绑定新的正文；隐藏页面或启用降低透明度等偏好时释放资源。加密文章始终不参与 WebGL 正文捕获。