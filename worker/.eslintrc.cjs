const path = require('path');

module.exports = {
  overrides: [
    {
      files: ['*.ts'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      parser: '@typescript-eslint/parser',
      plugins: [
        '@typescript-eslint',
      ],
      rules: {
        'arrow-body-style': 'off',
        'prefer-arrow-callback': 'off',
        'no-use-before-define': 'off',
        '@typescript-eslint/no-use-before-define': 'error',
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/no-misused-promises': [
          'error',
          {
            checksVoidReturn: false,
          },
        ],
      },
      settings: {
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: './tsconfig.json',
          },
        },
      },
      parserOptions: {
        project: path.resolve(__dirname, './tsconfig.json'),
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          impliedStrict: true,
        },
      },
    },
  ],
};
