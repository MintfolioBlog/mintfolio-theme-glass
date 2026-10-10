# Glass：设计依据与实现映射

查阅日期：2026-09-15。依据 Apple 当前 Human Interface Guidelines 的 Liquid Glass 材质规范，而不是仅模仿透明卡片截图。

## 官方来源

- [HIG：Materials](https://developer.apple.com/design/human-interface-guidelines/materials)：玻璃用于浮在内容上方的导航/控件层；普通内容使用稳定表面。阅读文本较多的控件优先 regular，控制使用范围，并响应减少透明度和提高对比度偏好。
- [Liquid Glass overview](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass)：材质与交互层级概述。
- [WWDC：Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)：玻璃的层次、环境色和动态视觉设计。
- [Apple：UI Design Dos and Don’ts](https://developer.apple.com/design/tips/)：适配屏幕、文字可读性和至少 44pt 的原生触控目标指导。

## 页面决策

- 玻璃只用于桌面导航胶囊和手机底部导航。文章、搜索结果、目录和菜单使用实色背景；不把整篇文章置于透明玻璃上。
- 使用偏高不透明度的 regular 风格背景、轻微高光边缘和阴影表达层级；正文始终使用明确的前景/背景色。
- 内容区使用系统字体、大标题、充足留白和安静的分组卡片。首页抽象渐变插画是装饰图形，不是玻璃内容容器。
- 手机三入口悬浮导航避开底部与左右安全区；更多菜单定位在导航上方，规避 backdrop-filter 导致的 fixed 包含块问题。
- 独立触控目标至少 44 CSS px，输入框文字至少 16 CSS px，不锁定缩放。
- 浅色、深色、跟随系统三种外观。transparency:false 可主动关闭玻璃效果；prefers-reduced-transparency、prefers-contrast 与 forced-colors 的系统偏好优先。

## Web 适配边界

这是遵循 HIG 的网页设计，不调用 SwiftUI/UIKit Liquid Glass，不能复刻原生实时折射、系统自动取色、触感或随环境变化的光学渲染。
使用 @supports 检测 backdrop-filter（含 WebKit 前缀）；不支持时保持实色导航。初版仅使用 CSS；目前折射实现和性能边界见下方更新说明。
浏览器未暴露的操作系统无障碍偏好无法检测，因此提供显式关闭透明效果的主题配置。
pt 到 CSS px 是网页交互尺寸适配；只通过系统字体栈使用设备字体，不打包 Apple SF 字体。

## 尚待确认

初版交付时未进行运行验证；后续预览和本次验证结果见文末。需后续集中确认 iOS Safari 与 Android Chrome、小屏/横屏、软键盘、200% 字号、玻璃降级、浅深模式、超长标题与表格。
不将已写入的 CSS 规则等同于真机验证通过。
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
