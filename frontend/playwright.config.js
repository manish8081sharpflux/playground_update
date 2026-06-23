// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 3,
  reporter: [['html'], ['list']],
  timeout: 30000,
  expect: { timeout: 10000 },

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Auth setup — runs first, saves state per role
    { name: 'auth-setup', testMatch: /.*\.setup\.js/ },

    // Role-based test suites
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      testMatch: /admin\/.*\.spec\.js/,
      dependencies: ['auth-setup'],
    },
    {
      name: 'coach',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/coach.json',
      },
      testMatch: /coach\/.*\.spec\.js/,
      dependencies: ['auth-setup'],
    },
    {
      name: 'student',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/student.json',
      },
      testMatch: /student\/.*\.spec\.js/,
      dependencies: ['auth-setup'],
    },
    {
      name: 'purchase-manager',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/pm.json',
      },
      testMatch: /pm\/.*\.spec\.js/,
      dependencies: ['auth-setup'],
    },
    {
      name: 'medical',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/medical.json',
      },
      testMatch: /medical\/.*\.spec\.js/,
      dependencies: ['auth-setup'],
    },
    {
      name: 'integration',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /integration\/.*\.spec\.js/,
      dependencies: ['auth-setup'],
    },
  ],

  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
