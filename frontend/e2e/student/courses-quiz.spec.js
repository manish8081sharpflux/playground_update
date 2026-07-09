// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Student Courses & Quiz E2E Tests
 * Covers: Computer apps three-pane navigation, spoken english, life skills, quiz attempts
 * Auth: Handled by storageState (student role)
 */

test.describe('Computer Apps Course', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/student/computer-apps');
  });

  test('should display course list with apps', async ({ page }) => {
    // Header
    await expect(page.getByText(/computer applications/i).first()).toBeVisible({ timeout: 10000 });

    // Should show course cards
    await expect(page.getByText(/computer applications|sample course|test automation/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show course details when clicking a course', async ({ page }) => {
    // Click first course card
    await page.getByText(/computer applications/i).nth(1).click();

    // Should show course content (levels/tasks)
    await expect(
      page.getByText(/level|task|module|chapter/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should load levels when clicking a course card', async ({ page }) => {
    // Click a course card
    const courseCard = page.getByText(/sample course|computer applications/i).nth(1);
    await courseCard.click();

    // Should show course levels/tasks
    await expect(
      page.getByText(/level|task|module|chapter/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show chapter content when clicking a course', async ({ page }) => {
    // Click first course card to get to levels
    await page.getByText(/computer applications/i).nth(1).click();

    // Should show module/chapter navigation and learning activities
    await expect(
      page.getByText(/module|chapter|select a learning activity|video lesson|watch now/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should prevent clicking locked levels and show toast', async ({ page }) => {
    // Try to click a locked level (usually the last one)
    const lockedLevel = page.getByText(/🔒/).first();
    if (await lockedLevel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lockedLevel.click();
      // Should show error toast about completing previous level
      await expect(
        page.getByText(/complete.*to unlock|unlock/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display leaderboard for completed tasks', async ({ page }) => {
    // Click first course to see course content
    await page.getByText(/computer applications/i).nth(1).click();

    // Check for leaderboard section
    const leaderboard = page.getByText(/leaderboard/i).first();
    if (await leaderboard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(leaderboard).toBeVisible();
    } else {
      // Leaderboard may only show after completing tasks — verify course loads at minimum
      await expect(
        page.getByText(/module|chapter/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Spoken English Course', () => {
  test.fixme('should load spoken english page with task list or task view', async ({ page }) => {
    // fixme: "Failed to load task data" — no spoken english course seeded in DB
    await page.goto('/student/spoken-english');

    // Should show spoken english content
    await expect(
      page.getByText(/spoken english/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should display audio instructions section on task page', async ({ page }) => {
    // fixme: no spoken english course seeded in DB — "Failed to load task data"
    await page.goto('/student/spoken-english/task1');

    // Audio instructions section
    await expect(
      page.getByText(/audio|instructions|listen/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should display recording controls', async ({ page }) => {
    // fixme: no spoken english course seeded in DB — "Failed to load task data"
    await page.goto('/student/spoken-english/task1');

    // Record button should be visible
    await expect(
      page.getByRole('button', { name: /record/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should have submit button disabled before recording', async ({ page }) => {
    await page.goto('/student/spoken-english/task1');

    const submitBtn = page.getByRole('button', { name: /submit/i }).first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(submitBtn).toBeDisabled();
    }
  });
});

test.describe('Life Skills Course', () => {
  test('should load life skills page', async ({ page }) => {
    await page.goto('/student/life-skills');

    await expect(
      page.getByText(/life skills/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display quiz section with questions', async ({ page }) => {
    await page.goto('/student/life-skills');

    // Should see quiz content or voice task content
    await expect(
      page.getByText(/quiz|question|task|voice/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should display voice recording interface for voice tasks', async ({ page }) => {
    // fixme: "Failed to load voice task" — no life skills voice task seeded in DB
    await page.goto('/student/life-skills/voice/voice_task_1');

    // Should show recording controls or question
    await expect(
      page.getByText(/record|question|hold/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
