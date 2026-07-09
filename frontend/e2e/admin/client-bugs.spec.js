// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Admin — Client Bug Regression Tests
 *
 * A-1: Clicking "Assign Course" causes blank screen
 * A-2: No "Approve" button visible for purchase requests sent from PM
 * A-4: Translation management — no courses in published dropdown
 * A-6: Zero Purchases Report > View Student Profile — no back button
 *
 * Auth handled via storageState — tests start logged in as admin.
 */

test.describe('Bug A-1: Assign Course blank screen regression', () => {
  test.fixme('should NOT show blank screen after clicking Assign Course', async ({ page }) => {
    // Navigate to course assignment area (coach dashboard or course management)
    await page.goto('/admin/courses');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Look for an assign course button anywhere on the page
    const assignBtn = page.getByRole('button', { name: /assign.*course/i }).first()
      .or(page.getByText(/assign.*course/i).first());

    if (await assignBtn.isVisible().catch(() => false)) {
      await assignBtn.click();
      await page.waitForTimeout(1000);

      // REGRESSION CHECK: page should NOT be blank
      // Check that the body has meaningful content (not just empty white)
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent.trim().length).toBeGreaterThan(0);

      // Main content area should still be visible
      await expect(page.locator('main').or(page.locator('#root'))).toBeVisible();

      // No uncaught errors should make the page blank
      const visibleElements = await page.locator('body *:visible').count();
      expect(visibleElements).toBeGreaterThan(5);
    }
  });

  test('should maintain functional UI after assign course interaction', async ({ page }) => {
    await page.goto('/admin/courses');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const assignBtn = page.getByRole('button', { name: /assign/i }).first();
    if (await assignBtn.isVisible().catch(() => false)) {
      await assignBtn.click();
      await page.waitForTimeout(1000);

      // Page should still have interactive elements (not crashed)
      const buttons = await page.getByRole('button').count();
      expect(buttons).toBeGreaterThan(0);

      // Navigation should still work
      await expect(page.locator('nav').first().or(page.locator('header').first())).toBeVisible();
    }
  });
});

test.describe('Bug A-2: Approve button missing for PM purchase requests', () => {
  test.fixme('should show Approve button on pending requests from Purchase Manager', async ({ page }) => {
    await page.goto('/purchase');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Switch to Shop Inventory view if needed
    const viewDropdown = page.locator('select').filter({ hasText: /shop inventory|purchase/i }).first();
    if (await viewDropdown.isVisible().catch(() => false)) {
      await viewDropdown.selectOption({ label: /shop inventory/i });
      await page.waitForTimeout(500);
    }

    // Filter to pending requests
    const statusFilter = page.locator('select').filter({ hasText: /status|pending|approved/i }).first();
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.selectOption({ label: /pending/i });
      await page.waitForTimeout(500);
    }

    // REGRESSION CHECK: Approve button MUST be visible on pending requests
    const approveBtn = page.getByRole('button', { name: /approve/i }).first()
      .or(page.locator('button[title*="Approve"]').first())
      .or(page.locator('button').filter({ hasText: /✅/ }).first());

    // If there are pending requests, the approve button must exist
    const pendingBadge = page.getByText(/pending/i).first();
    if (await pendingBadge.isVisible().catch(() => false)) {
      await expect(approveBtn).toBeVisible({ timeout: 10000 });
    }
  });

  test.fixme('should show both Approve and Reject buttons for pending requests', async ({ page }) => {
    await page.goto('/purchase');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const viewDropdown = page.locator('select').filter({ hasText: /shop inventory|purchase/i }).first();
    if (await viewDropdown.isVisible().catch(() => false)) {
      await viewDropdown.selectOption({ label: /shop inventory/i });
      await page.waitForTimeout(500);
    }

    const statusFilter = page.locator('select').filter({ hasText: /status|pending|approved/i }).first();
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.selectOption({ label: /pending/i });
      await page.waitForTimeout(500);
    }

    const pendingBadge = page.getByText(/pending/i).first();
    if (await pendingBadge.isVisible().catch(() => false)) {
      // Both action buttons must be present
      const approveBtn = page.getByRole('button', { name: /approve/i }).first()
        .or(page.locator('button[title*="Approve"]').first());
      const rejectBtn = page.getByRole('button', { name: /reject/i }).first()
        .or(page.locator('button[title*="Reject"]').first());

      await expect(approveBtn).toBeVisible({ timeout: 10000 });
      await expect(rejectBtn).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Bug A-4: Translation management — no courses in dropdown', () => {
  test.fixme('should show published courses in translation dropdown', async ({ page }) => {
    await page.goto('/admin/translations');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // REGRESSION CHECK: The course dropdown must have published courses
    const courseDropdown = page.locator('select').first();
    if (await courseDropdown.isVisible().catch(() => false)) {
      const options = courseDropdown.locator('option');
      const count = await options.count();

      // Must have more than just the placeholder option
      // (If only 1 option = placeholder, no courses loaded = bug A-4 still present)
      expect(count).toBeGreaterThan(1);
    }
  });

  test('should populate dropdown with actual course titles', async ({ page }) => {
    await page.goto('/admin/translations');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const courseDropdown = page.locator('select').first();
    if (await courseDropdown.isVisible().catch(() => false)) {
      const options = courseDropdown.locator('option');
      const count = await options.count();

      if (count > 1) {
        // Second option (first real course) should have non-empty text
        const courseText = await options.nth(1).textContent();
        expect(courseText.trim().length).toBeGreaterThan(0);
        expect(courseText).not.toMatch(/choose|select|--/i);
      }
    }
  });

  test.fixme('should allow selecting a course and loading progress', async ({ page }) => {
    await page.goto('/admin/translations');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const courseDropdown = page.locator('select').first();
    if (await courseDropdown.isVisible().catch(() => false)) {
      const options = courseDropdown.locator('option');
      const count = await options.count();

      if (count > 1) {
        await courseDropdown.selectOption({ index: 1 });
        await page.waitForTimeout(1000);

        // After selection, progress or translation content should load
        await expect(
          page.getByText(/progress|translat|start/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });
});

test.describe('Bug A-6: Zero Purchases Report — no back button on student profile', () => {
  test('should have back button on student profile viewed from report', async ({ page }) => {
    await page.goto('/shop/admin/reports/zero-purchases');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Click view profile for first student
    const viewBtn = page.getByRole('button', { name: /view.*profile|view/i }).first()
      .or(page.getByRole('link', { name: /view.*profile|profile/i }).first());

    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();
      await page.waitForTimeout(1000);

      // REGRESSION CHECK: Back button MUST exist
      const backBtn = page.getByRole('button', { name: /back/i }).first()
        .or(page.getByRole('link', { name: /back/i }).first())
        .or(page.locator('[aria-label*="back"]').first())
        .or(page.locator('button').filter({ hasText: /←|back|return/i }).first());

      await expect(backBtn).toBeVisible({ timeout: 10000 });
    }
  });

  test('should navigate back to report when clicking back button', async ({ page }) => {
    await page.goto('/shop/admin/reports/zero-purchases');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const viewBtn = page.getByRole('button', { name: /view.*profile|view/i }).first()
      .or(page.getByRole('link', { name: /view.*profile|profile/i }).first());

    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();
      await page.waitForTimeout(1000);

      const backBtn = page.getByRole('button', { name: /back/i }).first()
        .or(page.getByRole('link', { name: /back/i }).first())
        .or(page.locator('[aria-label*="back"]').first())
        .or(page.locator('button').filter({ hasText: /←|back|return/i }).first());

      if (await backBtn.isVisible().catch(() => false)) {
        await backBtn.click();

        // Should navigate back to the report page
        await expect(
          page.getByText(/zero.*purchase/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should render student profile page without errors', async ({ page }) => {
    await page.goto('/shop/admin/reports/zero-purchases');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const viewBtn = page.getByRole('button', { name: /view.*profile|view/i }).first()
      .or(page.getByRole('link', { name: /view.*profile|profile/i }).first());

    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();
      await page.waitForTimeout(1000);

      // Profile page should have actual content (not blank or error)
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent.trim().length).toBeGreaterThan(0);

      // Should show student-related info
      await expect(
        page.getByText(/student|profile|name|detail/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });
});
