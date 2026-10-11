/** Theme visuals only. Content, navigation and pagination remain in site.config.ts. */
/** @satisfies {import('@mintfolio/theme-glass/settings').GlassSettings} */
export default {
  appearance: 'system', // system / light / dark
  accentColor: 'blue', // blue / purple / pink / red / orange / yellow / green / mint / teal / cyan / indigo / brown / graphite
  transparency: true, // Liquid Glass 导航；访客开启“降低透明度”时始终为实色
  // 侧边栏 / 标签栏：留空使用站点导航。icon 为 SF Symbols 风格的图标名（如 house、doc.text、person.crop.circle）
  navigation: [
    // { icon: 'house', url: '/', label: '首页' },
    // { icon: 'doc.text', url: '/blog', label: '文章' },
    // { icon: 'person.crop.circle', url: '/about', label: '关于' },
  ],
  heroEyebrow: '随想与生活',
  heroTitle: '', // 留空使用站点描述（博客 slogan）
  heroDescription: '',
};
