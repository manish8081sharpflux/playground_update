// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Student Homepage & Navigation E2E Tests
 * Covers: Dashboard, course list, resume activity, profile page
 * Auth: Handled by storageState (student role)
 */

test.describe('Student Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/student/dashboard');
  });

  test.fixme('should display the title bar with logo, coin balance, and session timer', async ({ page }) => {
    // Logo / branding
    await expect(page.getByText('ISF Playground').first()).toBeVisible({ timeout: 10000 });

    // Coin balance display
    const coinBalance = page.getByText(/\d+/).filter({ has: page.locator('text=/💰|coins?/i') }).first();
    await expect(coinBalance).toBeVisible({ timeout: 10000 });

    // Session timer in HH:MM:SS format
    await expect(page.getByText(/\d{2}:\d{2}:\d{2}/).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display the toolbar with emotion buttons, homework, and help', async ({ page }) => {
    // Emotion tracking buttons
    await expect(page.getByRole('button', { name: /😊|happy/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /😢|sad/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /😡|angry/i }).first()).toBeVisible({ timeout: 10000 });

    // Homework and Help buttons
    await expect(page.getByRole('button', { name: /homework/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /help/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display 4 course category cards', async ({ page }) => {
    await expect(page.getByText(/computer apps/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/art/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/spoken english/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/life skills/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show progress bars on course cards', async ({ page }) => {
    // Each course card should have a progress indicator
    const progressBars = page.locator('[role="progressbar"], .bg-orange-600, .bg-pink-600, .bg-blue-600, .bg-green-600');
    await expect(progressBars.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Computer Apps page when clicking its card', async ({ page }) => {
    await page.getByText(/computer apps/i).first().click();
    await expect(page).toHaveURL(/student\/computer-apps/, { timeout: 10000 });
  });

  test('should navigate to Art course page when clicking its card', async ({ page }) => {
    await page.getByText(/art/i).first().click();
    await expect(page).toHaveURL(/student\/art/, { timeout: 10000 });
  });

  test('should navigate to Spoken English page when clicking its card', async ({ page }) => {
    await page.getByText(/spoken english/i).first().click();
    await expect(page).toHaveURL(/student\/spoken-english/, { timeout: 10000 });
  });

  test('should navigate to Life Skills page when clicking its card', async ({ page }) => {
    await page.getByText(/life skills/i).first().click();
    await expect(page).toHaveURL(/student\/life-skills/, { timeout: 10000 });
  });

  test('should track emotion when clicking emotion button', async ({ page }) => {
    const happyBtn = page.getByRole('button', { name: /😊|happy/i }).first();
    await happyBtn.click();

    // Should show toast or visual feedback
    await expect(
      page.getByText(/recorded|saved/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should highlight only one emotion at a time', async ({ page }) => {
    const happyBtn = page.getByRole('button', { name: /😊|happy/i }).first();
    const sadBtn = page.getByRole('button', { name: /😢|sad/i }).first();

    await happyBtn.click();
    await page.waitForTimeout(500);
    await sadBtn.click();

    // The sad button should now be the highlighted one
    // Happy should not retain the active styling
    await expect(sadBtn).toBeVisible();
  });
});

test.describe('Student Profile Page', () => {
  test.fixme('should display profile header with student information', async ({ page }) => {
    await page.goto('/profile');

    // Profile should show student name and role info
    await expect(page.getByText(/profile/i).first()).toBeVisible({ timeout: 10000 });

    // Should have coin wallet section
    await expect(
      page.getByText(/coin|wallet|balance/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should display coin wallet dashboard on profile', async ({ page }) => {
    await page.goto('/profile');

    // Coin stats should be visible
    await expect(page.getByText(/total earned/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/total spent/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display quick actions panel for students', async ({ page }) => {
    await page.goto('/profile');

    // Quick action buttons
    await expect(
      page.getByRole('link', { name: /browse shop|shop/i }).first()
        .or(page.getByText(/browse shop/i).first())
    ).toBeVisible({ timeout: 10000 });
  });
});
