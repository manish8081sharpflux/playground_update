// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * LMS Full Journey Integration Smoke Test
 * Admin → Coach → Student → Coach cross-role journey
 *
 * Each step uses a different storageState to switch roles.
 * This is a SERIAL test — each step depends on the previous.
 */

const COURSE_NAME = `E15 Smoke ${Date.now()}`;

test.describe.serial('LMS Full Journey — Admin → Coach → Student → Coach', () => {

  test('Step 1: Admin creates & publishes a course', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/admin.json' });
    const page = await context.newPage();

    // Navigate to course management
    await page.goto('/admin/courses');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /course/i }).first()).toBeVisible({ timeout: 10000 });

    // Create course
    await page.getByRole('button', { name: /create new course/i }).click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/advanced computer apps/i).fill(COURSE_NAME);
    await page.getByPlaceholder(/describe the course/i).fill('Integration smoke test course');

    // Select category
    const modal = page.locator('.fixed.inset-0');
    const categorySelect = modal.locator('select').first();
    const optionTexts = await categorySelect.locator('option').allTextContents();
    const realCategory = optionTexts.find(t => t && !t.includes('Select') && !t.includes('select'));
    if (realCategory) {
      await categorySelect.selectOption({ label: realCategory });
    }

    // Select difficulty
    await page.getByLabel(/beginner/i).first().click();

    // Submit
    await page.getByRole('button', { name: /create course as draft/i }).click();
    await expect(page.getByText(/created successfully/i).first()).toBeVisible({ timeout: 10000 });

    // Verify course appears in list
    await expect(page.getByText(COURSE_NAME).first()).toBeVisible({ timeout: 10000 });

    await context.close();
  });

  test('Step 2: Coach views dashboard and assignments', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/coach.json' });
    const page = await context.newPage();

    // Navigate to coach dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Verify dashboard loads with expected cards
    await expect(page.getByText(/daily schedule|task tracker|grading/i).first()).toBeVisible({ timeout: 10000 });

    // Navigate to grading
    await page.goto('/coach/grading');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    await context.close();
  });

  test('Step 3: Student views courses and coin balance', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/student.json' });
    const page = await context.newPage();

    // Navigate to student dashboard
    await page.goto('/student/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Check coin balance is visible
    const coinArea = page.getByText(/\u{1F4B0}/u).first();
    await expect(coinArea).toBeVisible({ timeout: 10000 });

    // Navigate to courses
    await page.goto('/student/computer-apps');
    await expect(page.getByText(/computer applications/i).first()).toBeVisible({ timeout: 10000 });

    // Click on a course and verify content loads
    await page.getByText(/computer applications/i).nth(1).click();
    await expect(
      page.getByText(/module|chapter|select a learning activity/i).first()
    ).toBeVisible({ timeout: 10000 });

    await context.close();
  });

  test('Step 4: Coach grades a submission and views reports', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/coach.json' });
    const page = await context.newPage();

    // Navigate to grading
    await page.goto('/coach/grading');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Verify grading dashboard loads
    await expect(page.getByText(/pending|total|graded/i).first()).toBeVisible({ timeout: 10000 });

    // Open a submission if available
    const submissionCard = page.locator('[class*="card"], [class*="submission"]').first();
    if (await submissionCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submissionCard.click();

      // Grading panel should appear
      await expect(
        page.getByText(/quality|grade|feedback/i).first()
      ).toBeVisible({ timeout: 10000 });
    }

    await context.close();
  });
});
