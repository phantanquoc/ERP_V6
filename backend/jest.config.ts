import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types$': '<rootDir>/src/types',
    '^@schemas$': '<rootDir>/src/schemas',
    '^@schemas/(.*)$': '<rootDir>/src/schemas/$1',
    '^@cron/(.*)$': '<rootDir>/src/cron/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts'],
  coverageDirectory: 'coverage',
  // ponytail: thresholds just below 2026-10-15 floor (stmts ~23, funcs ~20,
  // branches ~19) to gate regressions, not existing debt.
  coverageThreshold: {
    global: {
      statements: 22,
      branches: 18,
      functions: 19,
      lines: 22,
    },
  },
};

export default config;
