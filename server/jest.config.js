module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["controllers/**/*.js", "models/**/*.js", "middleware/**/*.js"],
  coverageDirectory: "coverage",
  verbose: true,
  testTimeout: 30000,
};
