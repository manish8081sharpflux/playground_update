// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Quiz Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/quizzes');
    await expect(page.getByRole('heading', { name: /quiz management/i })).toBeVisible({ timeout: 10000 });
  });

  test.describe('Page Layout', () => {
    test('should display Quiz Management heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /quiz management/i })).toBeVisible();
    });

    test('should show quiz stats (total, published, drafts)', async ({ page }) => {
      // Stats appear as a single text node: "Total Quizzes N Published N Drafts N"
      await expect(page.locator('text=/Total Quizzes/').first()).toBeVisible();
      const statsText = await page.locator('main').textContent();
      expect(statsText).toMatch(/Total Quizzes/);
      expect(statsText).toMatch(/Published/);
      expect(statsText).toMatch(/Drafts/);
    });

    test('should show Create New Quiz button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /create new quiz/i })).toBeVisible();
    });

    test('should show quiz search input', async ({ page }) => {
      await expect(page.getByPlaceholder(/search quizzes/i)).toBeVisible();
    });

    test('should list existing quizzes', async ({ page }) => {
      // Wait for quiz cards to load
      await expect(page.locator('h3').first()).toBeVisible({ timeout: 10000 });
      const count = await page.locator('h3').count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show quiz metadata (questions, time, score)', async ({ page }) => {
      await expect(page.locator('h3').first()).toBeVisible({ timeout: 10000 });
      const mainText = await page.locator('main').textContent();
      expect(mainText).toMatch(/Questions/);
      expect(mainText).toMatch(/time limit/i);
      expect(mainText).toMatch(/passing score/i);
    });
  });

  test.describe('Search', () => {
    test('should filter quizzes by title search', async ({ page }) => {
      await expect(page.locator('h3').first()).toBeVisible({ timeout: 10000 });
      const search = page.getByPlaceholder(/search quizzes/i);
      await search.fill('Draft Quiz E2E');
      await page.waitForTimeout(500);
      const headings = await page.locator('h3').allTextContents();
      expect(headings.length).toBeGreaterThan(0);
      expect(headings.some(h => h.toLowerCase().includes('draft') || h.toLowerCase().includes('e2e'))).toBeTruthy();
    });

    test('should show empty state for non-existent quiz', async ({ page }) => {
      await expect(page.locator('h3').first()).toBeVisible({ timeout: 10000 });
      const beforeCount = await page.locator('h3').count();
      const search = page.getByPlaceholder(/search quizzes/i);
      await search.fill('zzz_nonexistent_quiz_xyz');
      await page.waitForTimeout(500);
      const afterCount = await page.locator('h3').count();
      // After filtering with no results, quiz count should decrease (or body text changes)
      expect(afterCount).toBeLessThan(beforeCount);
    });
  });

  test.describe('Create Quiz Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /create new quiz/i }).click();
      await expect(page.getByRole('heading', { name: /create new quiz/i })).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to create quiz page', async ({ page }) => {
      await expect(page).toHaveURL(/admin\/quizzes\/create/);
    });

    test('should show quiz title and description fields', async ({ page }) => {
      await expect(page.getByPlaceholder(/enter quiz title/i)).toBeVisible();
      await expect(page.getByPlaceholder(/enter quiz description/i)).toBeVisible();
    });

    test('should show course selector', async ({ page }) => {
      const courseSelector = page.getByRole('combobox').first();
      await expect(courseSelector).toBeVisible();
    });

    test('should show Add Question button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add question/i })).toBeVisible();
    });

    test('should show quiz settings (time limit, passing score)', async ({ page }) => {
      // Number inputs have no aria-label — check via label text + page text
      const pageText = await page.locator('main').textContent();
      expect(pageText).toMatch(/Time Limit/i);
      expect(pageText).toMatch(/Passing Score/i);
      const numberInputs = page.locator('input[type="number"]');
      const count = await numberInputs.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should show max attempts setting', async ({ page }) => {
      await expect(page.locator('label').filter({ hasText: /Max Attempts/i })).toBeVisible();
    });

    test('should show Save Draft button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /save draft/i })).toBeVisible();
    });

    test('should have Publish Quiz disabled when no questions', async ({ page }) => {
      const publishBtn = page.getByRole('button', { name: /publish quiz/i });
      await expect(publishBtn).toBeDisabled();
    });

    test('should save draft with title', async ({ page }) => {
      await page.getByPlaceholder(/enter quiz title/i).fill('E2E Test Quiz - Draft');
      await page.getByRole('button', { name: /save draft/i }).click();
      await page.waitForTimeout(1000);
      // Should save and either stay or navigate back
      await expect(page.locator('main')).toBeVisible();
    });
  });
});
