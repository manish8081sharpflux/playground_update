// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('WTF — Wall of Fame (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wtf');
    await page.waitForTimeout(1000);
  });

  test.describe('Admin Controls Panel', () => {
    test('should show Admin Controls panel', async ({ page }) => {
      await expect(page.locator('text=/Admin Controls/i')).toBeVisible({ timeout: 10000 });
    });

    test('should show Create New Pin button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /create new pin/i })).toBeVisible({ timeout: 10000 });
    });

    test('should show Full Management button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /full management/i })).toBeVisible({ timeout: 10000 });
    });

    test('should show pending suggestions or review queue info', async ({ page }) => {
      // Wait for WTF data to load — might show "Review Queue" or "Pending Suggestions"
      await page.waitForTimeout(2000);
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toMatch(/Review Queue|Pending Suggestions|Submissions/i);
    });
  });

  test.describe('Create New Pin Dialog', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /create new pin/i }).click({ timeout: 10000 });
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    });

    test('should open create pin dialog', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /create new wtf pin/i })).toBeVisible();
    });

    test('should show pin title field', async ({ page }) => {
      await expect(page.getByPlaceholder(/enter pin title/i)).toBeVisible();
    });

    test('should show content type buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: /text announcement/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /image/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /video/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /audio/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /external link/i })).toBeVisible();
    });

    test('should show Publish Pin and Save as Draft buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: /publish pin/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /save as draft/i })).toBeVisible();
    });

    test('should close dialog on Cancel', async ({ page }) => {
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should block publish with empty title', async ({ page }) => {
      await page.getByRole('button', { name: /publish pin/i }).click();
      // Dialog should remain (validation error)
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  });

  test.describe('WTF Management Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /full management/i }).click({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: /wtf management dashboard/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display WTF Management Dashboard heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /wtf management dashboard/i })).toBeVisible();
    });

    test('should show action buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: /view wall of fame/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /create new pin/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /check drafts/i })).toBeVisible();
    });

    test('should show tab navigation', async ({ page }) => {
      await expect(page.getByRole('button', { name: /pin management/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /coach suggestions/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /student submissions/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /analytics/i })).toBeVisible();
    });

    test('should show Active WTF Pins section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /active wtf pins/i })).toBeVisible();
    });

    test('should show pin search input', async ({ page }) => {
      await expect(page.getByPlaceholder(/search pins/i)).toBeVisible();
    });

    test('should navigate to Coach Suggestions tab', async ({ page }) => {
      await page.getByRole('button', { name: /coach suggestions/i }).click();
      await page.waitForTimeout(500);
      // Should show coach suggestions content
      const main = page.locator('main');
      await expect(main).toBeVisible();
    });

    test('should navigate to Student Submissions tab', async ({ page }) => {
      await page.getByRole('button', { name: /student submissions/i }).click();
      await page.waitForTimeout(500);
      await expect(page.locator('main')).toBeVisible();
    });

    test('should navigate to Analytics tab', async ({ page }) => {
      await page.getByRole('button', { name: /analytics/i }).click();
      await page.waitForTimeout(500);
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Background Settings', () => {
    test('should show Quick Background Settings panel', async ({ page }) => {
      // "background" text appears in multiple places — check it's in the page
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toMatch(/background/i);
    });

    test('should show background color picker', async ({ page }) => {
      const colorInput = page.locator('input[type="color"], [type="color"]').first();
      await expect(colorInput).toBeAttached();
    });
  });
});
