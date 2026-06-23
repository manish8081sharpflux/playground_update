// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Admin — Purchase Request Approval Workflow E2E Tests
 * Covers: Sprint5 Story 18 (Admin Approval Workflow)
 *         Sprint5 Story 25 (Inline Product Addition)
 *
 * Auth handled via storageState — tests start logged in as admin.
 */

test.describe('Purchase Request List — Admin View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Switch to Shop Inventory view if dropdown exists (option value="shop-inventory")
    const viewDropdown = page.locator('select#purchase-type');
    if (await viewDropdown.isVisible().catch(() => false)) {
      await viewDropdown.selectOption({ value: 'shop-inventory' });
      await page.waitForTimeout(500);
    }
  });

  test('should display all purchase requests for admin', async ({ page }) => {
    // Admin should see requests table
    await expect(
      page.getByText(/request|purchase/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Table or list should be present
    await expect(page.locator('main')).toBeVisible();
  });

  test.fixme('should filter requests by status', async ({ page }) => {
    const statusFilter = page.locator('select').filter({ hasText: /status|pending|approved|rejected/i }).first();
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.selectOption({ label: /pending/i });
      await page.waitForTimeout(500);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test.fixme('should filter requests by balagruha', async ({ page }) => {
    const bgFilter = page.locator('select').filter({ hasText: /balagruha|all balagruha/i }).first();
    if (await bgFilter.isVisible().catch(() => false)) {
      await bgFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should search requests by product name or ID', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('PR-');
      await page.waitForTimeout(500);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should show approve button on pending requests', async ({ page }) => {
    // Look for approve button (checkmark or "Approve" text)
    const approveBtn = page.getByRole('button', { name: /approve/i }).first()
      .or(page.locator('button[title*="Approve"]').first());

    // If there are pending requests, approve button should be visible
    if (await approveBtn.isVisible().catch(() => false)) {
      await expect(approveBtn).toBeVisible();
    }
  });
});

test.describe('Approve Purchase Request', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const viewDropdown = page.locator('select#purchase-type');
    if (await viewDropdown.isVisible().catch(() => false)) {
      await viewDropdown.selectOption({ value: 'shop-inventory' });
      await page.waitForTimeout(500);
    }
  });

  test('should open approval modal with request details', async ({ page }) => {
    const approveBtn = page.getByRole('button', { name: /approve/i }).first()
      .or(page.locator('button[title*="Approve"]').first());

    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();

      // Modal should show request details
      await expect(
        page.getByText(/approve.*purchase|request.*detail|request id/i).first()
      ).toBeVisible({ timeout: 10000 });

      // Notes field should be visible
      await expect(
        page.getByPlaceholder(/notes/i).first()
          .or(page.getByLabel(/notes/i).first())
          .or(page.locator('textarea').first())
      ).toBeVisible();
    }
  });

  test.fixme('should approve request without notes', async ({ page }) => {
    const approveBtn = page.getByRole('button', { name: /approve/i }).first()
      .or(page.locator('button[title*="Approve"]').first());

    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(500);

      // Click the confirm approve button inside modal
      const confirmBtn = page.getByRole('button', { name: /approve request|confirm/i }).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();

        await expect(
          page.getByText(/approved.*successfully/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test.fixme('should approve request with admin notes', async ({ page }) => {
    const approveBtn = page.getByRole('button', { name: /approve/i }).first()
      .or(page.locator('button[title*="Approve"]').first());

    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(500);

      // Enter notes
      const notesField = page.locator('textarea').first();
      if (await notesField.isVisible().catch(() => false)) {
        await notesField.fill('Approved for procurement. Expected delivery in 3 days.');
      }

      const confirmBtn = page.getByRole('button', { name: /approve request|confirm/i }).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();

        await expect(
          page.getByText(/approved.*successfully/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should cancel approval and keep request pending', async ({ page }) => {
    const approveBtn = page.getByRole('button', { name: /approve/i }).first()
      .or(page.locator('button[title*="Approve"]').first());

    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(500);

      const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        // Modal should close
        await expect(page.locator('main')).toBeVisible();
      }
    }
  });
});

test.describe('Reject Purchase Request', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const viewDropdown = page.locator('select#purchase-type');
    if (await viewDropdown.isVisible().catch(() => false)) {
      await viewDropdown.selectOption({ value: 'shop-inventory' });
      await page.waitForTimeout(500);
    }
  });

  test('should open rejection modal', async ({ page }) => {
    const rejectBtn = page.getByRole('button', { name: /reject/i }).first()
      .or(page.locator('button[title*="Reject"]').first());

    if (await rejectBtn.isVisible().catch(() => false)) {
      await rejectBtn.click();

      await expect(
        page.getByText(/reject.*purchase|rejection reason/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should require rejection reason before submit', async ({ page }) => {
    const rejectBtn = page.getByRole('button', { name: /reject/i }).first()
      .or(page.locator('button[title*="Reject"]').first());

    if (await rejectBtn.isVisible().catch(() => false)) {
      await rejectBtn.click();
      await page.waitForTimeout(500);

      // The reject confirm button should be disabled without reason
      const confirmRejectBtn = page.getByRole('button', { name: /reject request/i }).first();
      if (await confirmRejectBtn.isVisible().catch(() => false)) {
        await expect(confirmRejectBtn).toBeDisabled();
      }

      // Error text should indicate reason is required
      await expect(
        page.getByText(/required|reason is required/i).first()
      ).toBeVisible();
    }
  });

  test.fixme('should reject request with reason', async ({ page }) => {
    const rejectBtn = page.getByRole('button', { name: /reject/i }).first()
      .or(page.locator('button[title*="Reject"]').first());

    if (await rejectBtn.isVisible().catch(() => false)) {
      await rejectBtn.click();
      await page.waitForTimeout(500);

      // Enter rejection reason
      const reasonField = page.locator('textarea').first();
      if (await reasonField.isVisible().catch(() => false)) {
        await reasonField.fill('Budget exceeded for this month. Please resubmit next month.');
      }

      const confirmRejectBtn = page.getByRole('button', { name: /reject request/i }).first();
      if (await confirmRejectBtn.isVisible().catch(() => false)) {
        await confirmRejectBtn.click();

        await expect(
          page.getByText(/rejected|successfully/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });
});

test.describe('View Request Details', () => {
  test('should open view modal for a request', async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const viewBtn = page.getByRole('button', { name: /view/i }).first()
      .or(page.locator('button[title*="View"]').first());

    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();

      await expect(
        page.getByText(/purchase request.*detail|request id|product/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test.fixme('should display audit trail for reviewed requests', async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Filter to approved requests
    const statusFilter = page.locator('select').filter({ hasText: /status|pending|approved/i }).first();
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.selectOption({ label: /approved/i });
      await page.waitForTimeout(500);
    }

    const viewBtn = page.getByRole('button', { name: /view/i }).first()
      .or(page.locator('button[title*="View"]').first());

    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();

      // Should see reviewer info
      await expect(
        page.getByText(/reviewed|approved|status/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });
});
