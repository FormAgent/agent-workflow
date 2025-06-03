module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: [ "**/__tests__/**/*.test.ts" ],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  extensionsToTreatAsEsm: [ ".ts" ],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@ai-sdk|ai)/)"
  ],
  moduleFileExtensions: [ 'ts', 'tsx', 'js', 'jsx', 'json', 'node' ]
};
