module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-var-requires': 'off',
    'no-console': 'off',
    'no-case-declarations': 'warn',
    'no-useless-escape': 'warn',
    'prefer-const': 'off',
    'no-var': 'off',
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'coverage',
    '**/*.spec.ts',
    '**/*.test.ts',
    '.github',
    '.eslintrc.js',
    'test',
  ],
};
