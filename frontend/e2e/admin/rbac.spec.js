// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('RBAC — Role-Based Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rbac');
    await expect(page.getByRole('heading', { name: /roles/i })).toBeVisible({ timeout: 10000 });
  });

  test.describe('Roles List', () => {
    test('should display roles heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /roles/i })).toBeVisible();
    });

    test('should show search bar', async ({ page }) => {
      await expect(page.getByPlaceholder(/search roles/i)).toBeVisible();
    });

    test('should display known roles', async ({ page }) => {
      // Scope to main to avoid matching "Hi Admin" banner heading
      const main = page.locator('main');
      await expect(main.locator('h3').filter({ hasText: /^Admin$/ })).toBeVisible();
      await expect(main.locator('h3').filter({ hasText: /^Coach$/ })).toBeVisible();
      await expect(main.locator('h3').filter({ hasText: /^Student$/ })).toBeVisible();
      await expect(main.locator('h3').filter({ hasText: /purchase-manager/i })).toBeVisible();
    });

    test('should show permission count for each role', async ({ page }) => {
      const permissionTexts = page.locator('text=/Permissions: \\d+\\/\\d+/');
      const count = await permissionTexts.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should filter roles by search', async ({ page }) => {
      const search = page.getByPlaceholder(/search roles/i);
      await search.fill('admin');
      await expect(page.locator('main').locator('h3').filter({ hasText: /^Admin$/ })).toBeVisible();
    });

    test('should show no match when searching non-existent role', async ({ page }) => {
      const search = page.getByPlaceholder(/search roles/i);
      await search.fill('zzz_nonexistent_role_xyz');
      const headings = await page.getByRole('heading', { level: 3 }).count();
      expect(headings).toBe(0);
    });
  });

  test.describe('Role Detail', () => {
    test('should show instructions to select a role', async ({ page }) => {
      await expect(page.locator('text=/select a role/i')).toBeVisible();
    });

    test('should open permission editor when clicking a role', async ({ page }) => {
      await page.getByRole('heading', { name: /^Admin$/i }).click();
      // Should show permissions panel with checkboxes or permission list
      await page.waitForTimeout(500);
      const checkboxes = await page.getByRole('checkbox').count();
      expect(checkboxes).toBeGreaterThan(0);
    });

    test('should show admin role with significant permission count', async ({ page }) => {
      // Find the permission text near the Admin role card
      const adminPermText = await page.locator('main').locator('text=/Permissions: \\d+\\/\\d+/').first().textContent();
      const match = adminPermText?.match(/(\d+)\/(\d+)/);
      expect(match).not.toBeNull();
      if (match) {
        const granted = parseInt(match[1]);
        expect(granted).toBeGreaterThan(5);
      }
    });
  });
});
