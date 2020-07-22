module.exports = {
  extends: 'erb/typescript',
  rules: {
    // A temporary hack related to IDE not resolving correct package.json
    'import/no-extraneous-dependencies': 'off',

    // I declare the following corrections to the ESLint config to be the one
    // true way to write code
    'react/destructuring-assignment': 'off',
    'class-methods-use-this': 'off',
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  settings: {
    'import/resolver': {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
      node: {},
      webpack: {
        config: require.resolve('./configs/webpack.config.eslint.js'),
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
};
