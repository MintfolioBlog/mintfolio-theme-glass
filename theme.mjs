import { defineTheme } from '@mintfolio/core/theme';
export default defineTheme({
  manifest: {
    id: 'glass', name: 'Glass', version: '0.4.2', engine: '^1.4.0',
    author: 'Mintfolio contributors', description: '遵循 Apple Human Interface Guidelines 的 Liquid Glass 网页主题：系统色、Dynamic Type、浮动标签栏与侧边栏。'
  },
  capabilities: { encryptedPosts: true, search: true, tags: true, categories: true, toc: true, darkMode: true },
  pages: {
    home: './src/pages/home.astro', post: './src/pages/post.astro',
    archive: './src/pages/archive.astro', page: './src/pages/page.astro',
    notFound: './src/pages/not-found.astro'
  },
  settings: {
    appearance: { type: 'select', label: '外观', options: ['system', 'light', 'dark'], default: 'system' },
    accentColor: {
      type: 'select', label: '强调色', description: 'Apple 系统色之一，用于选中状态、链接和主要按钮；graphite 为石墨灰。',
      options: ['blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'indigo', 'brown', 'graphite'], default: 'blue',
    },
    transparency: { type: 'boolean', label: 'Liquid Glass 导航', description: '关闭时导航使用实色背景。访客系统开启“降低透明度”时始终使用实色。', default: true },
    navigation: {
      type: 'array', label: '侧边栏 / 标签栏',
      description: '导航目的地。留空时使用站点配置中的导航并自动匹配图标。手机上超过 5 项时，多出的项目放进“更多”。',
      default: [],
      items: {
        type: 'object', label: '导航项', default: {},
        properties: {
          icon: { type: 'string', label: '图标', description: 'SF Symbols 风格的图标名，如 house、doc.text、person.crop.circle、book、tag（由 Framework7 Icons 提供，见 https://framework7.io/icons/ ）。留空时按说明文字自动匹配。', default: '' },
          url: { type: 'string', label: '链接地址', description: '站内路径（如 /blog）或完整网址。', default: '' },
          label: { type: 'string', label: '说明文字', default: '' },
        },
      },
    },
    heroEyebrow: { type: 'string', label: '首页短标语', default: '随想与生活' },
    heroTitle: { type: 'string', label: '首页标题', description: '留空使用站点描述（博客 slogan）。', default: '' },
    heroDescription: { type: 'string', label: '首页简介', description: '标题使用站点描述时默认不显示；填写了自定义标题时，留空则显示站点描述。', default: '' },
  }
});
