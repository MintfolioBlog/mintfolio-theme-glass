# Glass

遵循 Apple Human Interface Guidelines 的网页主题。导航和工具栏使用 Liquid Glass，内容层保持稳定的阅读底色：

- iOS 26 系统色，浅色、深色、提高对比度各一套，强调色可选；
- 字号使用 iOS Dynamic Type 默认档，字距按 SF Pro 字距表设置；
- 手机上是浮在底部的标签栏，平板上是顶部标签栏，桌面上是浮动侧边栏；
- 每页有大标题，滚动后在顶部显示小标题；内容采用分组列表、Today 风格卡片和胶囊按钮；
- 页面切换和 iOS 一样：进入详情页从右侧推入，返回时推出，切换标签时淡入淡出，导航保持不动。

独立 Astro 主题，包含首页、文章页、归档/分类/标签/系列页、Markdown 独立页面、关于页和 404。
复用 Core 的全文搜索、静态分页、密码文章解锁、SEO、订阅源和站点地图；支持多作者、阅读信息、置顶、系列目录、相关文章和上一篇/下一篇。

## 安装

要求 Node.js >= 22.12、Mintfolio Core `^0.4.2`、Theme API `^1.4.0`、Astro 7.3.x。Core 会安装配套的 Theme API，无需在站点重复声明。

主题使用 Core 0.4.2 的按功能客户端入口；文章目录只在文章页加载，密码文章继续由 Core 的 `ProtectedArticle` 处理，并在实际解锁时加载安全清理库。请同时满足 Core 与 Theme API 的最低版本要求。

~~~sh
npm install ./mintfolio-theme-glass-0.4.1.tgz
mintfolio theme use @mintfolio/theme-glass
mintfolio dev
~~~

不要把 npm scope 简写为主题目录名。图标、玻璃效果库和 Inter 字体会随主题一起从 npm 安装，不使用 CDN。

## 设置

完整示例见 [examples/theme.config.mjs](examples/theme.config.mjs)：列出全部设置项，逐项注明用途、默认值和可选值，可以直接复制为站点的 `_mintfolio/theme.config.mjs`。

~~~js
settings: {
  appearance: 'system',   // system / light / dark
  accentColor: 'blue',    // blue / purple / pink / red / orange / yellow / green / mint / teal / cyan / indigo / brown / graphite
  transparency: true,     // Liquid Glass 导航；false 使用实色导航
  navigation: [           // 侧边栏 / 标签栏；留空使用站点导航
    { icon: 'house', url: '/', label: '首页' },
    { icon: 'doc.text', url: '/blog', label: '文章' },
    { icon: 'person.crop.circle', url: '/about', label: '关于' },
  ],
  heroEyebrow: '随想与生活',
  heroTitle: '',          // 留空使用站点描述（博客 slogan）
  heroDescription: '',    // 填写了自定义标题时，留空则在标题下显示站点描述
},
~~~

- `accentColor` 从 Apple 系统色中选择，用于选中状态、链接和主要按钮；`graphite` 是石墨灰。
- `navigation` 的 `icon` 使用 SF Symbols 风格的名字，例如 `house`、`doc.text`、`person.crop.circle`、`book`、`tag`、`briefcase`。选中时自动换成 `.fill` 填充样式。
  - 图标由 [Framework7 Icons](https://framework7.io/icons/) 提供，它按 SF Symbols 的风格绘制，命名也基本一致。SF Symbols 本身的许可证只允许用在 Apple 平台的应用里，不能用于网页。
  - 名字写错时显示书签图标，构建时会给出提示。
- `navigation` 留空时使用站点配置中的导航，图标按名称自动匹配，并保证有首页和文章两项。
- 社交链接按 `icon` 或 `platform` 匹配 Simple Icons 品牌图标（twitter 自动对应 x）。邮件和 RSS 使用系统风格图标；Simple Icons 没有收录的品牌（例如 LinkedIn）显示通用链接图标。

## 导航与布局

- 宽度 < 744 CSS px：底部浮动的标签栏，图标在上、文字在下，右侧是独立的搜索按钮。超过 5 个目的地时，最后一项变成“更多”，打开一个底部弹出的列表。
- 744–1199 CSS px：标签栏移到顶部居中，图标和文字并排，参照 iPadOS。
- ≥ 1200 CSS px：左侧浮动侧边栏，含站点名、搜索入口和全部目的地，图标使用强调色。
- 文章页在 ≥ 1440 CSS px 时，目录显示在正文右侧并高亮当前章节；更窄时折叠在正文前面。
- 标签栏和侧边栏在页面之间保持不动，只有内容区切换；选中块会在标签之间弹性滑动。

## 无障碍

- 交互目标不小于 44 CSS px；输入框字号 17 px；不限制用户缩放。
- 系统开启“降低透明度”或“增强对比度”时，导航改为实色；增强对比度时同时换用 HIG 的高对比度系统色。
- 系统开启“减少动态效果”时，关闭页面切换、弹性动画和触摸涟漪。
- 支持 forced-colors 和打印。关闭 JavaScript 时所有页面仍可阅读和跳转；全文搜索与密码解锁需要 JavaScript。

设计依据、规格来源和验证记录见 [DESIGN.md](./DESIGN.md)。

## 开发

~~~sh
npm ci --ignore-scripts
npm run check
node tools/springs.mjs   # 重新生成弹簧动画曲线（写入 src/styles/tokens.css）
~~~

主题采用 GPL-3.0-only。依赖库的许可证见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。Apple、Liquid Glass 和 SF Symbols 是 Apple Inc. 的商标，本主题为社区作品，不代表 Apple 官方出品或认证。

## 站点 favicon（Core 0.4.1 / Theme API 1.3 起）

把图标放到站点的 `_mintfolio/public/favicon.ico`，在 `_mintfolio/site.config.ts` 的 `site` 中设置：

~~~ts
site: {
  title: '我的博客',
  url: 'https://example.com',
  favicon: '/favicon.ico',
},
~~~

可以使用 ICO、SVG 或 PNG，路径以 `/` 开头，也支持完整 HTTP(S) URL。配置中不要写 `_mintfolio/public` 前缀；空格应进行 URL 编码。省略 favicon 或设为 `''` 时使用主题默认图标。已配置但文件不存在时不会自动探测或回退，应确保该文件会被提交、构建和部署。

部署子目录由 Core 根据 Astro base 自动添加，无需每次更改图标路径。所有页面（包括 404 和其他内置兜底页）使用同一站点图标，切换主题后继续保留。自定义图标会替换整组主题默认图标，不会同时输出两者。浏览器可能缓存旧图标，更新后可改用 `'/favicon.ico?v=2'`。

命令行也支持 `mintfolio config set site site.favicon /favicon.ico`；设为空字符串可恢复默认。此功能需安装包含该能力的 Core 与主题版本；只升级主题而继续使用旧 Core 不会生效。
