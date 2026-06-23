// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: /total users/i })).toBeVisible({ timeout: 10000 });
  });

  test.describe('Dashboard Stats', () => {
    test('should display stats cards', async ({ page }) => {
      const main = page.locator('main');
      await expect(main.locator('h3').filter({ hasText: 'Total Users' }).first()).toBeVisible();
      await expect(main.locator('h3').filter({ hasText: 'Active Users' }).first()).toBeVisible();
      await expect(main.locator('h3').filter({ hasText: 'Inactive Users' }).first()).toBeVisible();
      await expect(main.locator('h3').filter({ hasText: /new users/i }).first()).toBeVisible();
    });

    test('should show numeric values in stats cards', async ({ page }) => {
      const statTexts = await page.locator('main').locator('text=/\\d+/').allTextContents();
      expect(statTexts.length).toBeGreaterThan(0);
    });
  });

  test.describe('Search and Filters', () => {
    test('should display search bar with placeholder', async ({ page }) => {
      const search = page.getByPlaceholder(/search users/i);
      await expect(search).toBeVisible();
    });

    test('should display balagruha filter dropdown', async ({ page }) => {
      const filter = page.getByRole('combobox', { name: /filter by balagruha/i });
      await expect(filter).toBeVisible();
      await expect(filter.locator('option', { hasText: 'All Balagruhas' })).toBeAttached();
    });

    test('should display role filter dropdown', async ({ page }) => {
      const filter = page.getByRole('combobox', { name: /filter by role/i });
      await expect(filter).toBeVisible();
    });

    test('should display status filter dropdown', async ({ page }) => {
      const filter = page.locator('select').filter({ has: page.locator('option', { hasText: 'All Statuses' }) }).first();
      await expect(filter).toBeVisible();
      await expect(filter.locator('option', { hasText: 'Active' }).first()).toBeAttached();
      await expect(filter.locator('option', { hasText: 'Inactive' }).first()).toBeAttached();
    });

    test('should filter by status Active', async ({ page }) => {
      const filter = page.locator('select').filter({ has: page.locator('option', { hasText: 'All Statuses' }) }).first();
      await filter.selectOption('Active');
      // Value is lowercase 'active', label is 'Active'
      await expect(filter).toHaveValue('active');
    });

    test('should type in search and update results', async ({ page }) => {
      const search = page.getByPlaceholder(/search users/i);
      await search.fill('zzz_nonexistent_user_xyz');
      // Show no match message or empty state
      await expect(page.locator('main')).toContainText(/no users|showing 0/i);
    });
  });

  test.describe('Users Table', () => {
    test('should display user table with headers', async ({ page }) => {
      await expect(page.getByRole('table').first()).toBeVisible();
      // Check column header text appears in the table header row
      const headerRow = page.locator('table thead tr').first();
      await expect(headerRow).toBeVisible();
      const headerText = await headerRow.textContent();
      expect(headerText).toMatch(/name/i);
      expect(headerText).toMatch(/email/i);
      expect(headerText).toMatch(/role/i);
      expect(headerText).toMatch(/actions/i);
    });

    test('should show Add User button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add user/i })).toBeVisible();
    });
  });

  test.describe('Add User Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /add user/i }).click();
      await expect(page.getByRole('heading', { name: /add new user/i })).toBeVisible({ timeout: 5000 });
    });

    test('should open add user modal', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /add new user/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /basic information/i })).toBeVisible();
    });

    test('should show name, email, password fields', async ({ page }) => {
      await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
    });

    test('should show role dropdown', async ({ page }) => {
      await expect(page.getByRole('combobox', { name: /role/i })).toBeVisible();
    });

    test('should show student info section with userId field', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /student information/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /user id/i })).toBeVisible();
    });

    test('should show Generate password button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /generate/i })).toBeVisible();
    });

    test('should show age and gender fields', async ({ page }) => {
      await expect(page.getByRole('spinbutton', { name: /age/i })).toBeVisible();
      await expect(page.getByRole('combobox', { name: /gender/i })).toBeVisible();
    });

    test('should show Medical History section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /medical history/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /add medical record/i })).toBeVisible();
    });

    test('should close modal on Cancel', async ({ page }) => {
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(page.getByRole('heading', { name: /add new user/i })).not.toBeVisible();
    });

    test('should block submission with empty required fields', async ({ page }) => {
      await page.getByRole('button', { name: /create user/i }).click();
      // Should remain on form (either validation messages or form stays visible)
      await expect(page.getByRole('heading', { name: /add new user/i })).toBeVisible();
    });

    test('should auto-fill password on Generate click', async ({ page }) => {
      const pwField = page.getByRole('textbox', { name: /password/i });
      const before = await pwField.inputValue();
      await page.getByRole('button', { name: /generate/i }).click();
      const after = await pwField.inputValue();
      expect(after.length).toBeGreaterThan(0);
      expect(after).not.toBe(before);
    });
  });
});
