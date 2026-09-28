// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://stitchandcrochet.com',
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true }, // exposes D1 / KV locally during `astro dev`
    imageService: 'passthrough',
    sessionKVBindingName: 'CACHE',
  }),
  trailingSlash: 'ignore',
});
