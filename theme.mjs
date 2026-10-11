import { defineTheme } from '@mintfolio/core/theme';
export default defineTheme({
  manifest: {
    id: 'glass', name: 'Glass', version: '0.3.1', engine: '^1.1.0',
    author: 'Mintfolio contributors', description: '遵循 Apple HIG 的 Liquid Glass 风格网页主题。'
  },
  capabilities: { encryptedPosts: true, search: true, tags: true, categories: true, toc: true },
  pages: {
    home: './src/pages/home.astro', post: './src/pages/post.astro',
    archive: './src/pages/archive.astro', page: './src/pages/page.astro',
    notFound: './src/pages/not-found.astro'
  },
  settings: {
    appearance: { type: 'select', label: '外观', options: ['system', 'light', 'dark'], default: 'system' },
    heroEyebrow: { type: 'string', label: '首页短标语', default: '随想与生活' },
    heroTitle: { type: 'string', label: '首页标题', default: '记录生活，自有光芒。' },
    heroDescription: { type: 'string', label: '首页简介', description: '留空使用站点描述。', default: '' },
    transparency: { type: 'boolean', label: '半透明导航', description: '关闭时使用实色导航。减少透明度偏好优先。', default: true }
  }
});