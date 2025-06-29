export default {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    'server/**/*.js',
    'shared/**/*.js',
    '!**/node_modules/**'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(puppeteer)/)'
  ],
  testTimeout: 30000
};