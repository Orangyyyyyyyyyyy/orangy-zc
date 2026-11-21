// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://orangy-zc.pages.dev',
  build: { format: 'directory' },
  compressHTML: true,
});
