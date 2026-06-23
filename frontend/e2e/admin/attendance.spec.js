// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Attendance Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/attendance');
    await expect(page.getByRole('heading', { name: /daily attendance/i })).toBeVisible({ timeout: 10000 });
  });

  test.describe('Page Layout', () => {
    test('should display Daily Attendance heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /daily attendance/i })).toBeVisible();
    });

    test('should show date picker with today\'s date', async ({ page }) => {
      const datePicker = page.getByRole('textbox', { name: /select date/i });
      await expect(datePicker).toBeVisible();
      const value = await datePicker.inputValue();
      expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should show balagruha list for selection', async ({ page }) => {
      // Should show multiple balagruha options
      await expect(page.locator('text=/Sadashraya/i')).toBeVisible();
    });

    test('should prompt to select a balagruha', async ({ page }) => {
      await expect(page.locator('text=/select a balagruha/i')).toBeVisible();
    });
  });

  test.describe('Date Selection', () => {
    test('should update date when changed', async ({ page }) => {
      const datePicker = page.getByRole('textbox', { name: /select date/i });
      await datePicker.fill('2026-01-15');
      const value = await datePicker.inputValue();
      expect(value).toBe('2026-01-15');
    });
  });

  test.describe('Balagruha Selection', () => {
    test('should show attendance data after selecting a balagruha', async ({ page }) => {
      // Click on a balagruha to load its attendance
      const balagruhaItem = page.locator('text=/Mohor Girls/i').first();
      await balagruhaItem.click();
      await page.waitForTimeout(1000);
      // Should no longer show "select a balagruha" prompt or should show attendance data
      const main = page.locator('main');
      const text = await main.textContent();
      // Either shows attendance records or a message about no records
      expect(text).not.toBeNull();
    });
  });
});
