/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }] },
  setupFiles: ['<rootDir>/test/load-env.ts'],
  // Rules share one Postgres schema; parallel workers would race on truncation.
  maxWorkers: 1,
  testTimeout: 20000,
};
