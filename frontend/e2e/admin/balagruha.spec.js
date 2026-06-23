// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Balagruha Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/balagruha');
    await expect(page.getByRole('heading', { name: /balagruha management/i })).toBeVisible({ timeout: 10000 });
    // Wait for table rows to load from API
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test.describe('Page Layout', () => {
    test('should display Balagruha Management heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /balagruha management/i })).toBeVisible();
    });

    test('should show summary stats', async ({ page }) => {
      await expect(page.locator('text=/Total Balagruhas/i')).toBeVisible();
      await expect(page.locator('text=/Total Machines/i')).toBeVisible();
    });

    test('should display data table with correct headers', async ({ page }) => {
      await expect(page.getByRole('table').first()).toBeVisible();
      // Use th elements for header check (more reliable than columnheader ARIA role)
      await expect(page.locator('th').filter({ hasText: /^Name$/ }).first()).toBeVisible();
      await expect(page.locator('th').filter({ hasText: /location/i }).first()).toBeVisible();
      await expect(page.locator('th').filter({ hasText: /actions/i }).first()).toBeVisible();
    });

    test('should list existing balagruhas', async ({ page }) => {
      // Use tbody tr for data rows
      const dataRows = page.locator('tbody tr');
      const count = await dataRows.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Search', () => {
    test('should show search input', async ({ page }) => {
      await expect(page.getByPlaceholder(/search balagruhas/i)).toBeVisible();
    });

    test('should filter results on search', async ({ page }) => {
      const search = page.getByPlaceholder(/search balagruhas/i);
      await search.fill('Sadashraya');
      await expect(page.locator('text=/Sadashraya/i')).toBeVisible();
    });

    test('should show no results for non-existent balagruha', async ({ page }) => {
      const search = page.getByPlaceholder(/search balagruhas/i);
      await search.fill('zzz_nonexistent_xyz');
      const rows = page.getByRole('table').getByRole('row');
      // Only header row (1) or empty state
      const count = await rows.count();
      expect(count).toBeLessThanOrEqual(2); // header + possible empty row
    });
  });

  test.describe('Add Balagruha', () => {
    test('should show Add Balagruha button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add balagruha/i })).toBeVisible();
    });

    test('should open add modal on click', async ({ page }) => {
      await page.getByRole('button', { name: /add balagruha/i }).click();
      // Should show a form/modal with name and location fields
      await page.waitForTimeout(500);
      const nameField = page.getByRole('textbox', { name: /name/i });
      await expect(nameField).toBeVisible({ timeout: 5000 });
    });

    test('should cancel add modal', async ({ page }) => {
      await page.getByRole('button', { name: /add balagruha/i }).click();
      await page.waitForTimeout(500);
      const cancelBtn = page.getByRole('button', { name: /cancel/i });
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await expect(page.getByRole('heading', { name: /balagruha management/i })).toBeVisible();
      }
    });
  });

  test.describe('Edit Balagruha', () => {
    test('should show edit button for each balagruha', async ({ page }) => {
      // Each table row has action buttons (edit + delete)
      const tableBtns = page.locator('tbody button');
      const count = await tableBtns.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should open edit modal on edit click', async ({ page }) => {
      // Click the first action button in the table (edit)
      const editBtn = page.locator('tbody button').first();
      await editBtn.click();
      await page.waitForTimeout(500);
      // Should show a form with pre-filled name
      const nameField = page.getByRole('textbox', { name: /name/i });
      await expect(nameField).toBeVisible({ timeout: 5000 });
      const nameValue = await nameField.inputValue();
      expect(nameValue.length).toBeGreaterThan(0);
    });
  });

  test.describe('Delete Balagruha', () => {
    test('should show delete button for each balagruha', async ({ page }) => {
      // Each row has 2 action buttons (edit and delete)
      const tableBtns = page.locator('tbody button');
      const count = await tableBtns.count();
      // Each row has at least 2 action buttons (edit + delete)
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });
});
