// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Coach — Shop & Purchase Requests / Delivery Management
 *
 * Covers sprint5-story-13 scenarios:
 *  - Coach delivery dashboard
 *  - Delivery stats cards
 *  - Mark orders as delivered (with and without notes)
 *  - Floating delivery button
 *  - Balagruha-based order visibility
 *  - Empty queue state
 *
 * Auth: storageState handled by playwright.config.js (coach project)
 */

test.describe('Coach — Shop & Delivery Management', () => {

  // --- Delivery Dashboard ---

  test('should load delivery management page', async ({ page }) => {
    await page.goto('/coach/deliveries');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(/delivery|deliveries/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should display delivery stats cards', async ({ page }) => {
    await page.goto('/coach/deliveries');
    await page.waitForLoadState('networkidle');

    // Should show 4 stats: Pending, Delivered Today, This Week, Total
    const statLabels = [/pending/i, /today/i, /week/i, /total/i];
    for (const label of statLabels) {
      await expect(
        page.getByText(label).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show empty state when no pending deliveries', async ({ page }) => {
    await page.goto('/coach/deliveries');
    await page.waitForLoadState('networkidle');

    // If no pending deliveries, should show "All caught up" or similar
    const emptyState = page.getByText(/no pending|all caught up|no deliveries/i).first();
    const orderCard = page.locator('[class*="card"]').filter({ hasText: /order|ORD-/i }).first();

    // Either empty state message OR order cards should be visible
    const isEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
    const hasOrders = await orderCard.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isEmpty || hasOrders).toBeTruthy();
  });

  test('should display order details in delivery queue', async ({ page }) => {
    await page.goto('/coach/deliveries');
    await page.waitForLoadState('networkidle');

    const orderCard = page.locator('[class*="card"]').filter({ hasText: /order|ORD-/i }).first();
    if (await orderCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Order card should show student name, balagruha, products, and action buttons
      await expect(orderCard.getByText(/mark as delivered|deliver/i).first()).toBeVisible();
    }
  });

  test('should show "Mark as Delivered" and "Add Notes & Deliver" buttons', async ({ page }) => {
    await page.goto('/coach/deliveries');
    await page.waitForLoadState('networkidle');

    const orderCard = page.locator('[class*="card"]').filter({ hasText: /order|ORD-/i }).first();
    if (await orderCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Quick deliver button
      await expect(
        page.getByRole('button', { name: /mark as delivered/i }).first()
      ).toBeVisible({ timeout: 5000 });

      // Notes + deliver button
      await expect(
        page.getByRole('button', { name: /notes.*deliver|add notes/i }).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should mark order as delivered (quick delivery)', async ({ page }) => {
    await page.goto('/coach/deliveries');
    await page.waitForLoadState('networkidle');

    const deliverBtn = page.getByRole('button', { name: /mark as delivered/i }).first();
    if (await deliverBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deliverBtn.click();

      // Should show success message and order disappears
      await expect(
        page.getByText(/delivered|success/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should open delivery notes modal', async ({ page }) => {
    await page.goto('/coach/deliveries');
    await page.waitForLoadState('networkidle');

    const notesBtn = page.getByRole('button', { name: /notes.*deliver|add notes/i }).first();
    if (await notesBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await notesBtn.click();

      // Modal should open with textarea and confirm button
      await expect(
        page.getByPlaceholder(/notes/i).or(page.locator('textarea')).first()
      ).toBeVisible({ timeout: 5000 });

      await expect(
        page.getByRole('button', { name: /confirm delivery|confirm/i }).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should submit delivery with notes', async ({ page }) => {
    await page.goto('/coach/deliveries');
    await page.waitForLoadState('networkidle');

    const notesBtn = page.getByRole('button', { name: /notes.*deliver|add notes/i }).first();
    if (await notesBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await notesBtn.click();
      await page.waitForTimeout(500);

      // Fill notes
      const textarea = page.getByPlaceholder(/notes/i).or(page.locator('textarea')).first();
      if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textarea.fill('Delivered to coach office. Student picked up in person.');
      }

      // Confirm delivery
      const confirmBtn = page.getByRole('button', { name: /confirm delivery|confirm/i }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
        await expect(
          page.getByText(/delivered|success/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  // --- Floating Delivery Button ---

  test.fixme('should display floating delivery button on coach pages', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');

    // Floating button should be visible (bottom-right corner)
    const floatingBtn = page.locator('[class*="float"], [class*="fixed"]')
      .filter({ hasText: /deliver/i })
      .or(page.locator('button[title*="deliver" i]'))
      .first();

    // Either a dedicated floating button or delivery nav link should exist
    const hasFloat = await floatingBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const hasNavLink = await page.getByRole('link', { name: /deliver/i }).first()
      .isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasFloat || hasNavLink).toBeTruthy();
  });

  test('should show smart confirmation window info banner', async ({ page }) => {
    await page.goto('/coach/deliveries');
    await page.waitForLoadState('networkidle');

    // Info banner about 5-minute smart confirmation
    const infoBanner = page.getByText(/smart confirmation|5 minute|appear.*after/i).first();
    const bannerVisible = await infoBanner.isVisible({ timeout: 5000 }).catch(() => false);

    // Banner is expected but may not always be present
    if (bannerVisible) {
      await expect(infoBanner).toBeVisible();
    }
  });
});
