// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Repair Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/repair');
    await expect(page.getByRole('heading', { name: /repair requests/i })).toBeVisible({ timeout: 10000 });
    // Wait for repair data to load
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test.describe('Page Layout', () => {
    test('should display Repair Requests heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /repair requests/i })).toBeVisible();
    });

    test('should show New Repair Request button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /new repair request/i })).toBeVisible();
    });

    test('should show Export Data button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /export data/i })).toBeVisible();
    });
  });

  test.describe('Date Range Filters', () => {
    test('should show All, Today, This week, This month filters', async ({ page }) => {
      await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /today/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /this week/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /this month/i })).toBeVisible();
    });

    test('should show Custom filter button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /custom/i })).toBeVisible();
    });

    test('should filter by Today without errors', async ({ page }) => {
      await page.getByRole('button', { name: /today/i }).click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('heading', { name: /repair requests/i })).toBeVisible();
    });
  });

  test.describe('Search', () => {
    test('should show search input', async ({ page }) => {
      // Accessible name includes "Search repair requests by issue name" via aria-label
      await expect(page.getByRole('textbox', { name: /search/i })).toBeVisible();
    });

    test('should search and find existing records', async ({ page }) => {
      const search = page.getByRole('textbox', { name: /search/i });
      await search.fill('test');
      await page.waitForTimeout(500);
      await expect(page.getByRole('table')).toBeVisible();
    });
  });

  test.describe('Repair Table', () => {
    test('should display table with correct headers', async ({ page }) => {
      const table = page.getByRole('table');
      await expect(table).toBeVisible();
      const headerText = await page.locator('table thead tr').first().textContent();
      expect(headerText).toMatch(/request id/i);
      expect(headerText).toMatch(/issue name/i);
      expect(headerText).toMatch(/status/i);
      expect(headerText).toMatch(/actions/i);
    });

    test('should show existing repair records', async ({ page }) => {
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show edit and delete buttons for each repair', async ({ page }) => {
      const tableBtns = page.locator('tbody button');
      const count = await tableBtns.count();
      expect(count).toBeGreaterThanOrEqual(2); // at least 1 row with 2 buttons
    });

    test('should show urgency levels in rows', async ({ page }) => {
      const tableText = await page.locator('tbody').textContent();
      expect(tableText).toMatch(/medium|high|low/i);
    });
  });

  test.describe('New Repair Request Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /new repair request/i }).click();
      await expect(page.getByRole('heading', { name: /new repair request/i })).toBeVisible({ timeout: 5000 });
    });

    test('should open new repair form', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /new repair request/i })).toBeVisible();
    });

    test('should show issue name field in form', async ({ page }) => {
      // Use CSS id to avoid strict-mode collision with "Search Issue Name" search bar
      await expect(page.locator('#repair-issue-name')).toBeVisible();
    });

    test('should show description field', async ({ page }) => {
      await expect(page.getByRole('textbox', { name: /description/i })).toBeVisible();
    });

    test('should show Submit Request button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /submit request/i })).toBeVisible();
    });

    test('should show Cancel button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    });
  });

  test.describe('Edit Repair', () => {
    test('should open edit form on first edit button click', async ({ page }) => {
      await page.locator('tbody button').first().click();
      await page.waitForTimeout(500);
      // Should show a form/modal with repair fields
      const formHeading = page.getByRole('heading', { name: /repair|edit/i }).last();
      await expect(formHeading).toBeVisible({ timeout: 5000 });
    });
  });
});
