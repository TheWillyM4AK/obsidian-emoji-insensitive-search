import { defineConfig, globalIgnores } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['node_modules/**', 'main.js', 'tests/**', '*.config.*', 'versions.json']),
  ...obsidianmd.configs.recommended,
  {
    files: ['manifest.json'],
    languageOptions: { parser: tseslint.parser },
    rules: { 'obsidianmd/validate-manifest': 'error' }
  },
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: { allowDefaultProject: ['manifest.json'] },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.json']
      }
    }
  }
);
