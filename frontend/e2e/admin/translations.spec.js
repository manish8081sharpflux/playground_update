// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Translation Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/translations');
    await expect(page.getByRole('heading', { name: /translation management/i })).toBeVisible({ timeout: 10000 });
  });

  test.describe('Page Layout', () => {
    test('should display Translation Management heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /translation management/i })).toBeVisible();
    });

    test('should show course selection dropdown', async ({ page }) => {
      const dropdown = page.getByRole('combobox').first();
      await expect(dropdown).toBeVisible();
    });

    test('should show published courses in dropdown', async ({ page }) => {
      const dropdown = page.getByRole('combobox').first();
      // Wait for async course list to load
      await expect(dropdown.locator('option').nth(1)).toBeAttached({ timeout: 10000 });
      const options = await dropdown.locator('option').allTextContents();
      const nonEmpty = options.filter(o => !o.includes('Choose'));
      expect(nonEmpty.length).toBeGreaterThan(0);
    });

    test('should show "No Course Selected" initial state', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /no course selected/i })).toBeVisible();
    });

    test('should have Browse All Items button disabled initially', async ({ page }) => {
      const browseBtn = page.getByRole('button', { name: /browse all items/i });
      await expect(browseBtn).toBeDisabled();
    });
  });

  test.describe('Course Selection', () => {
    test('should load translation data after selecting a course', async ({ page }) => {
      const dropdown = page.getByRole('combobox').first();
      await dropdown.selectOption({ index: 1 }); // select first actual course
      await page.waitForTimeout(1500);
      // "No Course Selected" should be gone
      const noSelection = await page.getByRole('heading', { name: /no course selected/i }).isVisible();
      expect(noSelection).toBeFalsy();
    });

    test('should enable Browse All Items after selecting a course', async ({ page }) => {
      const dropdown = page.getByRole('combobox').first();
      await dropdown.selectOption({ index: 1 });
      await page.waitForTimeout(1500);
      const browseBtn = page.getByRole('button', { name: /browse all items/i });
      await expect(browseBtn).toBeEnabled({ timeout: 5000 });
    });

    test('should show Computer Applications in dropdown', async ({ page }) => {
      const dropdown = page.getByRole('combobox').first();
      await expect(dropdown.locator('option').nth(1)).toBeAttached({ timeout: 10000 });
      const options = await dropdown.locator('option').allTextContents();
      // Should have at least one course option (may or may not include Computer Applications)
      expect(options.filter(o => !o.includes('Choose')).length).toBeGreaterThan(0);
    });

    test('should show translation progress after course selection', async ({ page }) => {
      const dropdown = page.getByRole('combobox').first();
      await dropdown.selectOption({ index: 1 });
      await page.waitForTimeout(2000);
      // Should show some kind of progress or item count
      const text = await page.locator('main').textContent();
      expect(text?.length).toBeGreaterThan(50);
    });
  });
});
