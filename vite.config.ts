import { defineConfig } from 'vite-plus';

// Shared settings for vp test, vp lint and vp fmt across all packages. Packaging (vp pack) is set
// per package in packages/<name>/vite.config.ts, from scripts/pack-config.mjs.
export default defineConfig({
  // Before each commit (.vite-hooks/pre-commit runs vp staged): format and lint what is staged.
  staged: {
    '*.{ts,tsx,js,mjs,css,json}': 'vp check --fix',
  },
  test: {
    include: ['packages/*/test/unit/**/*.test.ts'],
  },
  lint: {
    plugins: ['typescript', 'import', 'react'],
    categories: {
      correctness: 'error',
      suspicious: 'warn',
    },
    rules: {
      // JSX uses the automatic runtime; stylesheets are imported for their side effect.
      'react/react-in-jsx-scope': 'off',
      'import/no-unassigned-import': 'off',
      'no-shadow': 'off',
      'no-underscore-dangle': 'off',
    },
    ignorePatterns: ['**/dist/**', '_site/**'],
  },
  fmt: {
    printWidth: 120,
    singleQuote: true,
    semi: true,
    trailingComma: 'all',
    ignorePatterns: ['**/__screenshots__/**', '**/*.md', 'pnpm-lock.yaml'],
    overrides: [
      {
        // shadcn items and the shadcn preview follow shadcn's own style, so they read like the
        // components they sit next to in a project.
        files: ['packages/*/registry/**', 'packages/*/site/shadcn-preview/**'],
        options: { singleQuote: false, semi: false, printWidth: 100 },
      },
    ],
  },
});
