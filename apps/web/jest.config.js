const { createCjsPreset } = require('jest-preset-angular/presets');

/** @type {import('jest').Config} */
module.exports = {
  ...createCjsPreset({ tsconfig: '<rootDir>/tsconfig.spec.json' }),
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};
