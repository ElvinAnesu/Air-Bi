/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.(test|spec).(ts|tsx)", "**/*.(test|spec).(ts|tsx)"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
}

module.exports = config
