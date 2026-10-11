# Glass

遵循 Apple Liquid Glass HIG 的网页主题，将玻璃效果限制在导航层，正文保持稳定的阅读底色。

独立 Astro 主题，包含首页、文章页、归档/分类/标签/系列页、Markdown 独立页面、关于页和 404。
复用 Core 的全文搜索、静态分页、密码文章解锁、SEO、订阅源和站点地图；支持多作者、阅读信息、置顶、系列目录、相关文章和上一篇/下一篇。
不读取宿主私有内容、不依赖其他主题，无远程字体、CDN 或 UI 框架。

## 安装

要求 Node.js >= 22.12、Mintfolio Core 0.3.x、Astro 7.3.x。本次发行版本为 0.3.0。

将 artifacts/mintfolio-theme-glass-0.4.0.tgz 复制到你的站点目录，再运行：

~~~sh
npm install ./mintfolio-theme-glass-0.4.0.tgz
mintfolio theme use @mintfolio/theme-glass
mintfolio dev
~~~

不要把 npm scope 简写为主题目录名。切换后 Core 会在 theme.config.mjs 的 settings 中写入带注释的设置，支持：

~~~js
settings: {
  appearance: 'system', // system / light / dark
  heroEyebrow: '随想与生活',
  heroTitle: '记录生活，自有光芒。',
  heroDescription: '', // 空字符串使用站点描述
  transparency: true, // false 使用实色导航
},
~~~

网站资料、导航、文章和分页继续在原有站点配置中维护。首页展示首篇文章和随后最多六篇文章，“查看全部”进入归档。
手机底部导航固定保留首页、文章和更多；更多菜单完整呈现自定义导航，并提供搜索与 RSS。无需 JavaScript 即可打开菜单、阅读公开文章和使用归档；全文搜索与密码解锁需要 JavaScript。

## 移动端实现

- 使用 viewport-fit=cover、safe-area-inset-* 和可缩放视口，不限制用户缩放。
- 小于 600 CSS px 使用三入口底部导航；其余宽度使用桌面/平板导航。
- 大字号、长中文标题、长 URL 自动换行，布局列使用 minmax(0,1fr)，媒体宽度受容器约束。
- 代码块、表格独立滚动，目录在窄屏移到正文前方。搜索输入框最小 16 CSS px。
- 短横屏窗口取消覆盖正文的固定导航；菜单无需 hover，键盘焦点可见。
- 独立按钮/导航遵循 44 CSS px 的最小触控目标。正文行内链接保持自然排版。
- 尊重系统明暗、减少动态效果和高对比度；提供打印布局。

Web 的 CSS px 不等同于 Android dp 或 Apple pt，此处为网页交互尺寸适配。平台原生字体通过系统字体栈使用，不分发 Apple 字体文件。

## 开发与交付状态

源码入口：theme.mjs、src/pages、src/layouts、src/styles、src/settings.ts。
设计文档、官方来源和 Web 适配边界见 [DESIGN.md](./DESIGN.md)。

已完成源码、安装包和浏览器预览。新增动效及 Glass 折射的检查记录见 DESIGN.md；未运行 UI 单元测试或真机验证。
已检查 Chromium 的窄屏布局、菜单和无障碍偏好；Safari 真机兼容性和实际手机性能仍待确认。

已有 lockfile 和 vendor 本地 Core/SDK 归档，可使用 npm ci --ignore-scripts 安装开发依赖。
需要用户要求检查时执行 npm run check；打包使用 npm pack --ignore-scripts --pack-destination artifacts，不自动触发检查。
开发依赖更新可使用 tools/update-local-deps.mjs（需要 npm_execpath 指向 npm-cli.js）。

主题采用 GPL-3.0-only。Material/Apple 名称用于说明设计参考，不代表官方出品或认证。
## 2026-09-15：折射与交互动效更新

接入 simple-liquid-glass 5.3.0 的 Web Component（MIT），由本地构建打包，不加载 CDN。使用可见导航上的一个光学表面：Chromium 使用低强度 SVG shift 位移；其他浏览器在允许捕获时使用 WebGL，失败时保留 CSS 磨砂效果。选择此库是因为它不要求 React，并提供移动端 WebGL 路径。
导航标签保持在透镜外的独立前景层。采用低强度平滑位移、轻度模糊、高光和短时触按涟漪；没有持续流动的页面动画。
非 Chromium 的 WebGL 需要对正文生成本地背景快照，长文章、字体和外部媒体可能增加成本或无法完整捕获；不对密码文章启用该捕获路径，减少动态效果时也关闭此路径。
可见导航切换或页面卸载时销毁旧组件，释放库的资源；关闭透明效果/提高对比度时直接移除组件。

参考：
- https://github.com/lucaperullo/simple-liquid-glass
- https://developer.apple.com/design/human-interface-guidelines/motion

已做浏览器运行检查：320px 明暗模式无横向溢出；菜单可展开；减少动态效果后没有活动页面动画；关闭透明后无折射实例；无页面脚本错误。
Chromium 的 SVG 和模拟 iOS 条件的 WebGL 路径已启动。没有 WebKit/iPhone 真机结果，也没有真实手机帧率结论。
折射修正：移除在扁长导航中产生重复文字轮廓的 rim 映射，改为 scale=8、lens-strength=0.5 的 shift 映射；触按扰动降至 0.5，WebGL strength 降至 0.035。已在当前浏览器预览检查，未发现脚本错误或手机宽度横向溢出。

## 0.3.0 发行

主题包与 manifest 统一为 0.3.0，依赖 Mintfolio Core ^0.3.0。可使用 npm install @mintfolio/theme-glass@0.3.0 安装，随后使用 mintfolio theme use @mintfolio/theme-glass 切换。


0.4.0：支持 Core 0.4，配置示例采用 `_mintfolio/theme.config.mjs` 的 `settings`。Core 0.3 用户仍按该版本的配置方式使用。
