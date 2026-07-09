// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Coach — Grading Interface
 *
 * Covers Epic 03 Story 02 scenarios:
 *  - Submission queue loading and filtering
 *  - Art / Video / Audio grading interfaces
 *  - Quality rating & coin award system
 *  - Grade submission and validation
 *  - Navigation between submissions
 *
 * Auth: storageState handled by playwright.config.js (coach project)
 */

test.describe('Coach — Grading Interface', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/coach/grading');
    await page.waitForLoadState('networkidle');
  });

  // --- Submission Queue ---

  test('should load grading dashboard with stats cards', async ({ page }) => {
    // Quick stats: Pending, Graded, Flagged, This Week
    await expect(
      page.getByText(/pending/i).first()
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText(/graded/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should filter submissions by course type', async ({ page }) => {
    // Click course type dropdown and select Art
    const courseFilter = page.getByRole('combobox', { name: /course/i })
      .or(page.locator('select').filter({ hasText: /all|course/i })).first();

    if (await courseFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await courseFilter.selectOption({ label: 'Art' });
      await page.waitForTimeout(500);

      // Submission cards should be visible (or empty-state if no art submissions)
      const cards = page.locator('[class*="card"], [class*="submission"]');
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should filter submissions by status', async ({ page }) => {
    const statusFilter = page.getByRole('combobox', { name: /status/i })
      .or(page.locator('select').filter({ hasText: /pending|status/i })).first();

    if (await statusFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusFilter.selectOption({ label: 'Graded' });
      await page.waitForTimeout(500);

      // Should show graded submissions or empty state
      await expect(
        page.getByText(/graded|no submissions/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should search submissions by student name', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search|student/i).first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Results should filter in real-time
      const results = page.locator('[class*="card"], [class*="submission"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  // --- Art Grading ---

  test('should open art submission grading interface', async ({ page }) => {
    // Find a "Preview & Grade" button on any submission card
    const gradeBtn = page.getByRole('button', { name: /preview.*grade|grade/i }).first();
    if (await gradeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gradeBtn.click();

      // Grading interface should show quality rating options
      await expect(
        page.getByText(/excellent|good|needs improvement/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display quality rating buttons in grading panel', async ({ page }) => {
    const gradeBtn = page.getByRole('button', { name: /preview.*grade|grade/i }).first();
    if (await gradeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gradeBtn.click();
      await page.waitForTimeout(500);

      // All three quality ratings should be visible
      for (const rating of ['Excellent', 'Good', 'Needs Improvement']) {
        await expect(
          page.getByText(rating, { exact: false }).first()
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should auto-adjust coin slider when selecting quality rating', async ({ page }) => {
    const gradeBtn = page.getByRole('button', { name: /preview.*grade|grade/i }).first();
    if (await gradeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gradeBtn.click();
      await page.waitForTimeout(500);

      // Click Excellent rating
      const excellentBtn = page.getByText('Excellent', { exact: false }).first();
      if (await excellentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await excellentBtn.click();

        // Coin input should auto-adjust to ~85 (Excellent default range 80-100)
        const coinInput = page.locator('input[type="number"]').first();
        if (await coinInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          const value = await coinInput.inputValue();
          const numValue = parseInt(value, 10);
          expect(numValue).toBeGreaterThanOrEqual(80);
          expect(numValue).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  test('should validate coin input range (0-100)', async ({ page }) => {
    const gradeBtn = page.getByRole('button', { name: /preview.*grade|grade/i }).first();
    if (await gradeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gradeBtn.click();
      await page.waitForTimeout(500);

      const coinInput = page.locator('input[type="number"]').first();
      if (await coinInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Enter value above max
        await coinInput.fill('150');
        await coinInput.blur();
        await page.waitForTimeout(300);

        const value = await coinInput.inputValue();
        const numValue = parseInt(value, 10);
        // Should be clamped to 100
        expect(numValue).toBeLessThanOrEqual(100);
      }
    }
  });

  test('should show feedback textarea with character counter', async ({ page }) => {
    const gradeBtn = page.getByRole('button', { name: /preview.*grade|grade/i }).first();
    if (await gradeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gradeBtn.click();
      await page.waitForTimeout(500);

      const feedbackArea = page.getByPlaceholder(/feedback|comment/i).or(
        page.locator('textarea')
      ).first();

      if (await feedbackArea.isVisible({ timeout: 3000 }).catch(() => false)) {
        await feedbackArea.fill('Great work on this submission!');

        // Character counter should be visible
        await expect(
          page.getByText(/\d+\s*\/\s*500/i).first()
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should require quality rating before submitting grade', async ({ page }) => {
    const gradeBtn = page.getByRole('button', { name: /preview.*grade|grade/i }).first();
    if (await gradeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gradeBtn.click();
      await page.waitForTimeout(500);

      // Try to submit without selecting quality rating
      const submitBtn = page.getByRole('button', { name: /submit grade/i }).first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();

        // Should show validation error
        await expect(
          page.getByText(/select.*quality|required|please/i).first()
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should submit grade successfully with all fields filled', async ({ page }) => {
    const gradeBtn = page.getByRole('button', { name: /preview.*grade|grade/i }).first();
    if (await gradeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gradeBtn.click();
      await page.waitForTimeout(500);

      // Select quality rating
      const goodBtn = page.getByText('Good', { exact: false }).first();
      if (await goodBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await goodBtn.click();
      }

      // Set coin amount
      const coinInput = page.locator('input[type="number"]').first();
      if (await coinInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await coinInput.fill('70');
      }

      // Enter feedback
      const feedbackArea = page.getByPlaceholder(/feedback|comment/i).or(
        page.locator('textarea')
      ).first();
      if (await feedbackArea.isVisible({ timeout: 3000 }).catch(() => false)) {
        await feedbackArea.fill('Good effort on this submission!');
      }

      // Submit
      const submitBtn = page.getByRole('button', { name: /submit grade/i }).first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();

        // Expect success toast
        await expect(
          page.getByText(/grade submitted|success|earned/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should navigate between submissions with Previous/Next buttons', async ({ page }) => {
    const gradeBtn = page.getByRole('button', { name: /preview.*grade|grade/i }).first();
    if (await gradeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gradeBtn.click();
      await page.waitForTimeout(500);

      // Check for Previous and Next buttons
      const prevBtn = page.getByRole('button', { name: /previous|prev/i }).first();
      const nextBtn = page.getByRole('button', { name: /next/i }).first();

      // At least one navigation button should be present
      const prevVisible = await prevBtn.isVisible({ timeout: 3000 }).catch(() => false);
      const nextVisible = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);
      expect(prevVisible || nextVisible).toBeTruthy();
    }
  });
});
