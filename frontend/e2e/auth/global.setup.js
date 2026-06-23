// @ts-check
const { test: setup, expect } = require('@playwright/test');
const path = require('path');

const roles = [
  {
    name: 'admin',
    email: process.env.E2E_ADMIN_EMAIL || 'admin@gmail.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'test123',
    file: path.join(__dirname, '../.auth/admin.json'),
    loginPath: '/admin/login',
    dashboardPattern: /dashboard/,
  },
  {
    name: 'coach',
    email: process.env.E2E_COACH_EMAIL || 'coach@gmail.com',
    password: process.env.E2E_COACH_PASSWORD || 'test123',
    file: path.join(__dirname, '../.auth/coach.json'),
    loginPath: '/admin/login',
    dashboardPattern: /dashboard/,
  },
  {
    name: 'student',
    email: process.env.E2E_STUDENT_EMAIL || 'vis@gmail.com',
    password: process.env.E2E_STUDENT_PASSWORD || 'test123',
    userId: process.env.E2E_STUDENT_USERID || '1234',
    file: path.join(__dirname, '../.auth/student.json'),
    loginPath: '/login',
    dashboardPattern: /student\/dashboard|dashboard|home/,
  },
  {
    name: 'pm',
    email: process.env.E2E_PM_EMAIL || 'purchase@gmail.com',
    password: process.env.E2E_PM_PASSWORD || 'password123',
    file: path.join(__dirname, '../.auth/pm.json'),
    loginPath: '/admin/login',
    dashboardPattern: /dashboard/,
  },
  {
    name: 'medical',
    email: process.env.E2E_MEDICAL_EMAIL || 'samplet@gmail.com',
    password: process.env.E2E_MEDICAL_PASSWORD || 'password123',
    file: path.join(__dirname, '../.auth/medical.json'),
    loginPath: '/admin/login',
    dashboardPattern: /dashboard/,
  },
];

for (const role of roles) {
  setup(`authenticate as ${role.name}`, async ({ page }) => {
    await page.goto(role.loginPath);
    if (role.name === 'student') {
      // Student login uses userId field only
      await page.getByPlaceholder(/userId/i).fill(String(role.userId));
    } else {
      await page.getByPlaceholder(/email/i).fill(role.email);
      await page.getByPlaceholder(/password/i).fill(role.password);
    }
    await page.getByRole('button', { name: /login|sign in|submit/i }).click();
    await expect(page).toHaveURL(role.dashboardPattern, { timeout: 15000 });
    await page.context().storageState({ path: role.file });
  });
}
