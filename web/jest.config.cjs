module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.test.json',
      useESM: true,
    },
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};
