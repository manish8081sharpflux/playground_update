// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Machine Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/machines');
    await expect(page.getByRole('heading', { name: /machine management/i })).toBeVisible({ timeout: 10000 });
    // Wait for machine list to load from API
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test.describe('Page Layout', () => {
    test('should display Machine Management heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /machine management/i })).toBeVisible();
    });

    test('should show Register Machine and Refresh buttons', async ({ page }) => {
      // Aria-labels: "Register a new machine", "Refresh machine list"
      await expect(page.getByRole('button', { name: /register.*machine|new machine/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
    });

    test('should display machine table with headers', async ({ page }) => {
      const table = page.getByRole('table');
      await expect(table).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /machine id/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /mac address/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /balagruha/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    });

    test('should list registered machines', async ({ page }) => {
      const rows = page.getByRole('table').getByRole('row');
      const count = await rows.count();
      expect(count).toBeGreaterThan(1); // header + at least one machine
    });
  });

  test.describe('Search and Filter', () => {
    test('should show search input', async ({ page }) => {
      // Placeholder is "Search by MAC address, serial number, or machine ID"
      await expect(page.locator('input[placeholder*="MAC address"], input[placeholder*="machine"]')).toBeVisible();
    });

    test('should show balagruha filter', async ({ page }) => {
      const balagruhaFilter = page.locator('select, [role="combobox"]').first();
      await expect(balagruhaFilter).toBeVisible();
    });

    test('should search machines by machine ID', async ({ page }) => {
      const search = page.locator('input[placeholder*="MAC address"], input[placeholder*="machine"]');
      await search.fill('s28');
      await page.waitForTimeout(500);
      const tableText = await page.locator('tbody').textContent();
      expect(tableText).toContain('s28');
    });
  });

  test.describe('Machine Actions', () => {
    test('should show View Logs button for each machine', async ({ page }) => {
      const logBtns = page.getByRole('button', { name: /view.*logs/i });
      const count = await logBtns.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show Edit button for each machine', async ({ page }) => {
      const editBtns = page.getByRole('button', { name: /edit/i });
      const count = await editBtns.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show Deactivate button for active machines', async ({ page }) => {
      const deactivateBtns = page.getByRole('button', { name: /deactivate/i });
      const count = await deactivateBtns.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should open edit modal on Edit click', async ({ page }) => {
      await page.getByRole('button', { name: /edit/i }).first().click();
      await page.waitForTimeout(500);
      // Should show a form or modal
      const modal = page.locator('[role="dialog"], .modal, form').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Register Machine', () => {
    test('should open Register Machine modal', async ({ page }) => {
      // Button aria-label is "Register a new machine"
      await page.getByRole('button', { name: /register.*machine|new machine/i }).click();
      await page.waitForTimeout(1000);
      // Should show a form with machine fields
      const form = page.locator('[role="dialog"], .modal, form').first();
      await expect(form).toBeVisible({ timeout: 8000 });
    });
  });
});
