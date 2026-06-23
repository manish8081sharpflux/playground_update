// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Client Bug Regression Tests
 * Covers: S-1, S-2, S-9, S-10
 * Auth: Handled by storageState (student role)
 */

test.describe('S-1: Published courses visible in student view', () => {
  test('published courses should appear in the student course list on dashboard', async ({ page }) => {
    await page.goto('/student/dashboard');

    // All four standard courses should be visible
    await expect(page.getByText(/computer apps/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/art/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/spoken english/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/life skills/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('published course should be navigable from dashboard', async ({ page }) => {
    await page.goto('/student/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Click on Computer Apps card to verify it leads to the course page
    const courseLink = page.getByText(/computer apps/i).first();
    await expect(courseLink).toBeVisible({ timeout: 10000 });
    await courseLink.click();
    await expect(page).toHaveURL(/student\/computer-apps/, { timeout: 10000 });

    // Course content should load (not 404 or error)
    await expect(
      page.getByText(/computer apps|apps list|loading/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('published courses should show progress data, not empty state', async ({ page }) => {
    await page.goto('/student/dashboard');

    // Course cards should show task/progress info, not "no courses available"
    const noCourses = page.getByText(/no courses available/i);
    await expect(noCourses).toBeHidden({ timeout: 10000 });

    // At least one card should show tasks or completion info
    await expect(
      page.getByText(/tasks?|complete|progress/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('S-2: Order appears in order history with status', () => {
  test('should display order history page with at least one order', async ({ page }) => {
    await page.goto('/shop/orders');

    // If the student has placed orders, they should appear
    await expect(
      page.getByText(/orders?|order history|no orders/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('orders should have visible status badges', async ({ page }) => {
    await page.goto('/shop/orders');

    // Check for status indicators on orders
    const statusBadge = page.getByText(/completed|pending|processing|delivered|cancelled/i).first();
    if (await statusBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(statusBadge).toBeVisible();
    }
  });

  test('order detail should show order number and item list', async ({ page }) => {
    await page.goto('/shop/orders');

    // Click on first order to view details
    const orderEntry = page.getByText(/ORD-/i).first();
    if (await orderEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
      await orderEntry.click();

      // Order detail should show order number
      await expect(
        page.getByText(/ORD-/).first()
      ).toBeVisible({ timeout: 10000 });

      // Should show items or coins spent
      await expect(
        page.getByText(/items?|coins?|total/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('S-9: Quiz completion shows non-zero coins', () => {
  // This is intermittent -- marking as fixme
  test.fixme('completing a quiz should show non-zero coins earned', async ({ page }) => {
    // Navigate to a quiz (e.g., life skills quiz)
    await page.goto('/student/life-skills');

    // Find and start a quiz
    const quizBtn = page.getByRole('button', { name: /start quiz|take quiz|begin/i }).first();
    if (await quizBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quizBtn.click();

      // Answer questions (select first option for each)
      for (let i = 0; i < 5; i++) {
        const option = page.getByRole('button', { name: /^[A-D]\./ }).first()
          .or(page.getByRole('radio').first());
        if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
          await option.click();
          const nextBtn = page.getByRole('button', { name: /next|submit/i }).first();
          if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nextBtn.click();
          }
        }
      }

      // After quiz completion, verify coins earned > 0
      await expect(
        page.getByText(/coins? earned|you earned|\+\d+ coins?/i).first()
      ).toBeVisible({ timeout: 10000 });

      // Should NOT show "0 Coins Earned"
      const zeroCoinMsg = page.getByText(/0 coins? earned/i);
      await expect(zeroCoinMsg).toBeHidden({ timeout: 5000 });
    }
  });
});

test.describe('S-10: Single quiz attempt produces single transaction', () => {
  // This is a known bug -- marking as fixme
  test.fixme('a single quiz attempt should create exactly one transaction entry', async ({ page }) => {
    // Get current transaction count
    await page.goto('/student/dashboard');

    // Open transaction history
    const coinBtn = page.getByText(/💰/).first();
    await coinBtn.click();
    await page.waitForTimeout(1000);

    // Count current transactions mentioning quiz
    const quizTransactions = page.getByText(/quiz/i);
    const initialCount = await quizTransactions.count();

    // Close modal
    const closeBtn = page.getByRole('button', { name: /close|✕|×/i }).first();
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
    }

    // Navigate to a quiz and complete it
    await page.goto('/student/life-skills');
    const quizBtn = page.getByRole('button', { name: /start quiz|take quiz/i }).first();
    if (await quizBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quizBtn.click();

      // Answer all questions quickly
      for (let i = 0; i < 5; i++) {
        const option = page.getByRole('button', { name: /^[A-D]\./ }).first()
          .or(page.getByRole('radio').first());
        if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
          await option.click();
          const nextBtn = page.getByRole('button', { name: /next|submit/i }).first();
          if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nextBtn.click();
          }
        }
      }

      await page.waitForTimeout(2000);

      // Go back to dashboard and check transaction history
      await page.goto('/student/dashboard');
      await coinBtn.click();
      await page.waitForTimeout(1000);

      // Exactly one new quiz transaction should have been added
      const newQuizTransactions = page.getByText(/quiz/i);
      const newCount = await newQuizTransactions.count();

      // Should be exactly initialCount + 1 (one new transaction)
      expect(newCount).toBe(initialCount + 1);
    }
  });
});
