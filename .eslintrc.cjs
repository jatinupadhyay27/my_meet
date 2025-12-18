module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    es2021: true,
    browser: true,
    node: true,
  },
  overrides: [
    {
      files: ['backend/**/*.ts'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
      },
    },
    {
      files: ['frontend/**/*.tsx', 'frontend/**/*.ts'],
      env: {
        browser: true,
        node: false,
      },
    },
  ],
};


