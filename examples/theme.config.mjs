// @ts-check
/**
 * Glass 主题的完整配置示例，列出了全部可配置项。
 *
 * 用法：复制到站点的 `_mintfolio/theme.config.mjs`，再按需修改。
 * - 没写的字段使用主题默认值；下面的取值除导航示例外都是默认值。
 * - 改完重启 `mintfolio dev`；`mintfolio theme check` 会指出写错的字段名或取值。
 * - 站点名称、个人资料、导航、分页等内容设置在 `site.config.ts` 中，不在这里。
 */
export default {
  // 使用的主题包。
  theme: '@mintfolio/theme-glass',

  // 主题外观设置，只对上面这个主题有效。
  settings: {
    // 外观。
    // 可选：'system' 跟随访客系统 / 'light' 浅色 / 'dark' 深色。默认 'system'。
    appearance: 'system',

    // 强调色，Apple 系统色之一，用于选中状态、链接和主要按钮。默认 'blue'。
    // 可选：'blue' / 'purple' / 'pink' / 'red' / 'orange' / 'yellow' / 'green' /
    //       'mint' / 'teal' / 'cyan' / 'indigo' / 'brown' / 'graphite'（石墨灰）。
    accentColor: 'blue',

    // Liquid Glass 导航。false 时导航使用实色背景。默认 true。
    // 访客系统开启“降低透明度”时始终使用实色。
    transparency: true,

    // 侧边栏（宽屏）/ 标签栏（窄屏）的导航目的地。默认 []，即使用 site.config.ts 中的导航并自动匹配图标。
    // 手机上超过 5 项时，多出的项目放进“更多”。下面是示例，删掉全部条目即恢复默认。
    navigation: [
      {
        // 图标：SF Symbols 风格的图标名，由 Framework7 Icons 提供，见 https://framework7.io/icons/ 。
        // 留空时按 label 自动匹配。
        icon: 'house',
        // 链接地址：站内路径（如 /blog）或完整网址。
        url: '/',
        // 说明文字。
        label: '首页',
      },
      {
        icon: 'doc.text', // 图标名。
        url: '/blog', // 链接地址。
        label: '文章', // 说明文字。
      },
      {
        icon: 'person.crop.circle', // 图标名。
        url: '/about', // 链接地址。
        label: '关于', // 说明文字。
      },
      {
        icon: 'link', // 图标名。
        url: 'https://github.com/example', // 链接地址，可以是站外网址。
        label: 'GitHub', // 说明文字。
      },
    ],

    // 首页短标语，显示在首页标题上方。默认 '随想与生活'；设为 '' 不显示。
    heroEyebrow: '随想与生活',

    // 首页标题。默认 ''，即使用站点描述（site.description）。
    heroTitle: '',

    // 首页简介。默认 ''。
    // 标题使用站点描述时默认不显示；填写了自定义 heroTitle 时，留空则显示站点描述。
    heroDescription: '',
  },

  // 可选：用自己的 Astro 文件替换主题的某个页面，路径相对 `_mintfolio/`。
  // 可替换的页面：home / post / archive / page / notFound。写法见 Core 文档的 Theme API。
  // overrides: {
  //   pages: {
  //     archive: './overrides/archive.astro',
  //   },
  // },
};
