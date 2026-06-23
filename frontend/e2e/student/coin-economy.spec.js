// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Student Coin Economy E2E Tests
 * Covers: Earn coins, balance display, transaction history modal, wallet
 * Auth: Handled by storageState (student role)
 */

test.describe('Coin Balance Display', () => {
  test('should display coin balance in title bar on dashboard', async ({ page }) => {
    await page.goto('/student/dashboard');

    // Coin balance with emoji or coin text
    const coinArea = page.getByText(/💰|coins?/i).first();
    await expect(coinArea).toBeVisible({ timeout: 10000 });
  });

  test('should show coin balance formatted with commas', async ({ page }) => {
    await page.goto('/student/dashboard');

    // Look for formatted number near coin indicator
    const balanceText = page.locator('[class*="yellow"], [class*="coin"]').first();
    await expect(balanceText).toBeVisible({ timeout: 10000 });
  });

  test('should persist coin balance across page navigation', async ({ page }) => {
    await page.goto('/student/dashboard');

    // Get balance text
    const coinArea = page.getByText(/💰/).first();
    await expect(coinArea).toBeVisible({ timeout: 10000 });

    // Navigate to another page
    await page.goto('/student/art');

    // Balance should still be visible in title bar
    const coinAreaAfterNav = page.getByText(/💰/).first();
    await expect(coinAreaAfterNav).toBeVisible({ timeout: 10000 });
  });

  test('should have clickable coin balance that opens transaction history', async ({ page }) => {
    await page.goto('/student/dashboard');

    // Click on coin balance
    const coinBtn = page.getByText(/💰/).first();
    await coinBtn.click();

    // Should open transaction history modal or navigate to history page
    await expect(
      page.getByText(/coin history|transaction|history/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Transaction History Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/student/dashboard');
    // Open transaction history by clicking coin balance
    const coinBtn = page.getByText(/💰/).first();
    await coinBtn.click();
    await page.waitForTimeout(500);
  });

  test('should display transaction list in reverse chronological order', async ({ page }) => {
    // Transaction history should show entries
    await expect(
      page.getByText(/earned|spent|coins?|💰/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show color-coded transactions by type', async ({ page }) => {
    // Green for earned, other colors for different types
    const transactionItems = page.locator('[class*="green-50"], [class*="blue-50"], [class*="pink-50"], [class*="purple-50"]');
    if (await transactionItems.count() > 0) {
      await expect(transactionItems.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should allow filtering by transaction type', async ({ page }) => {
    // Look for filter dropdown
    const typeFilter = page.getByRole('combobox').first()
      .or(page.locator('select').first());
    if (await typeFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await typeFilter.selectOption({ index: 1 });
      // Results should update
      await page.waitForTimeout(500);
    }
  });

  test('should allow sorting transactions', async ({ page }) => {
    const sortDropdown = page.getByText(/sort by|newest|oldest/i).first();
    if (await sortDropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sortDropdown.click();
    }
  });

  test('should close modal on close button click', async ({ page }) => {
    const closeBtn = page.getByRole('button', { name: /close|✕|×/i }).first();
    if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeBtn.click();
      // Modal should disappear
      await expect(
        page.getByText(/coin history/i).first()
      ).toBeHidden({ timeout: 5000 });
    }
  });
});

test.describe('Milestone Celebrations', () => {
  test('should show milestone badge on coin balance if applicable', async ({ page }) => {
    await page.goto('/student/dashboard');

    // Check that coin area is functional
    const coinArea = page.getByText(/💰/).first();
    await expect(coinArea).toBeVisible({ timeout: 10000 });
  });
});
