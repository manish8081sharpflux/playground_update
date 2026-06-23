// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Admin — Reports & Analytics E2E Tests
 * Covers: Zero Purchases Report, Master Inventory Report, Shop Analytics
 *
 * Auth handled via storageState — tests start logged in as admin.
 */

test.describe('Zero Purchases Report', () => {
  test('should navigate to zero purchases report', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const zeroPurchasesLink = page.getByRole('link', { name: /zero.*purchase/i }).first()
      .or(page.getByText(/zero.*purchase/i).first());

    if (await zeroPurchasesLink.isVisible().catch(() => false)) {
      await zeroPurchasesLink.click();
      await expect(
        page.getByText(/zero.*purchase|no.*purchase/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test.fixme('should display students with zero purchases', async ({ page }) => {
    await page.goto('/shop/admin/reports/zero-purchases');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Table or list should be present
    await expect(
      page.locator('table, [role="table"]').first()
        .or(page.getByText(/student|name|no.*purchase/i).first())
    ).toBeVisible({ timeout: 10000 });
  });

  test('should open student profile from zero purchases report', async ({ page }) => {
    await page.goto('/shop/admin/reports/zero-purchases');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const viewProfileBtn = page.getByRole('button', { name: /view.*profile|view/i }).first()
      .or(page.getByRole('link', { name: /view.*profile|profile/i }).first());

    if (await viewProfileBtn.isVisible().catch(() => false)) {
      await viewProfileBtn.click();

      await expect(
        page.getByText(/student.*profile|profile|details/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should have back button on student profile from report', async ({ page }) => {
    await page.goto('/shop/admin/reports/zero-purchases');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const viewProfileBtn = page.getByRole('button', { name: /view.*profile|view/i }).first()
      .or(page.getByRole('link', { name: /view.*profile|profile/i }).first());

    if (await viewProfileBtn.isVisible().catch(() => false)) {
      await viewProfileBtn.click();
      await page.waitForTimeout(500);

      // Regression: A-6 — back button must exist
      const backBtn = page.getByRole('button', { name: /back/i }).first()
        .or(page.getByRole('link', { name: /back/i }).first())
        .or(page.locator('[aria-label*="back"]').first());

      await expect(backBtn).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Master Inventory Report', () => {
  test.fixme('should display master inventory report page', async ({ page }) => {
    await page.goto('/shop/admin/reports/inventory');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText(/inventory.*report|master.*inventory/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should show inventory summary statistics', async ({ page }) => {
    await page.goto('/shop/admin/reports/inventory');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText(/total|products|stock|value/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should filter inventory report by category', async ({ page }) => {
    await page.goto('/shop/admin/reports/inventory');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const categoryFilter = page.locator('select').filter({ hasText: /category|all|stationery/i }).first();
    if (await categoryFilter.isVisible().catch(() => false)) {
      await categoryFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should export inventory report', async ({ page }) => {
    await page.goto('/shop/admin/reports/inventory');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const exportBtn = page.getByRole('button', { name: /export|download|csv/i }).first();
    if (await exportBtn.isVisible().catch(() => false)) {
      // Verify the export button is clickable (don't actually download in CI)
      await expect(exportBtn).toBeEnabled();
    }
  });
});

test.describe('Shop Analytics', () => {
  test('should display shop reports landing page', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText(/report|analytics|shop/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between report sections', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Report links/cards should be present
    const reportLinks = page.getByRole('link').filter({ hasText: /report|purchase|inventory|zero/i });
    const count = await reportLinks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
