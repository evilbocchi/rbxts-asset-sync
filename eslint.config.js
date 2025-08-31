import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                jsx: true,
                useJSXTextNode: true,
                ecmaVersion: 2018,
                sourceType: 'module',
                project: './tsconfig.json',
            },
            globals: {
                // Node.js globals
                Buffer: 'readonly',
                process: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                fetch: 'readonly',
                NodeJS: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
            prettier: prettier,
        },
        rules: {
            ...typescript.configs.recommended.rules,
            'prettier/prettier': 'warn',
        },
    },
    prettierConfig,
    {
        ignores: [
            'out/**/*',
            'test/**/*',
            'example/**/*',
            'vitest.config.ts',
            'dist/**/*',
            'docs/**/*',
            'assetMap.ts',
            'eslint.config.js'
        ],
    },
];
