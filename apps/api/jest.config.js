/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
    // `cookie` (used by app.inject()) is ESM-only, so it has to be compiled for Jest's CommonJS runtime.
    'node_modules[\\\\/]cookie[\\\\/].+\\.js$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: { allowJs: true, module: 'commonjs', moduleResolution: 'bundler' },
      },
    ],
  },
  transformIgnorePatterns: ['node_modules[\\\\/](?!cookie[\\\\/])'],
};
