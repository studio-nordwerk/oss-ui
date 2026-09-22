import { defineConfig } from 'vite-plus';
import { packConfig } from '../../scripts/pack-config.mjs';

export default defineConfig({
  pack: packConfig(import.meta.dirname),
});
