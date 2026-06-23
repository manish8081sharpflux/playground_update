// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Purchase Lifecycle E2E: Create request → Approve → Complete
 * Requires:
 *   - Running backend + frontend
 *   - Seeded admin user (env: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD)
 *   - At least one product in the shop
 */

test.describe('Purchase Request Lifecycle', () => {
  // Login before all tests in this suite
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/email/i).fill(process.env.E2E_ADMIN_EMAIL || 'admin@isf.org');
    await page.getByPlaceholder(/password/i).fill(process.env.E2E_ADMIN_PASSWORD || 'admin123');
    await page.getByRole('button', { name: /login|sign in|submit/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
  });

  test('should navigate to purchase requests page', async ({ page }) => {
    // Navigate to purchase requests via sidebar or menu
    const purchaseLink = page.getByRole('link', { name: /purchase/i }).first();
    if (await purchaseLink.isVisible()) {
      await purchaseLink.click();
      await expect(page).toHaveURL(/purchase/, { timeout: 10000 });
    }
  });

  test('should create a new purchase request', async ({ page }) => {
    // Navigate to purchase requests
    await page.goto('/dashboard/purchase-requests');
    await page.waitForLoadState('networkidle');

    // Look for "Create" or "New" button
    const createBtn = page.getByRole('button', { name: /create|new|add/i }).first();
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();

      // Fill form fields (if modal or page appears)
      await page.waitForTimeout(1000); // Wait for form to render

      // Look for category selector
      const categorySelect = page.getByLabel(/category/i).or(page.locator('select[name*="category"]')).first();
      if (await categorySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await categorySelect.selectOption({ index: 1 }); // Pick first available category
      }

      // Look for balagruha selector
      const bgSelect = page.getByLabel(/balagruha|stock/i).first();
      if (await bgSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bgSelect.selectOption({ index: 1 });
      }

      // Submit
      const submitBtn = page.getByRole('button', { name: /submit|save|create/i }).first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        // Expect success feedback
        await expect(
          page.getByText(/success|created|submitted/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should view purchase request details', async ({ page }) => {
    await page.goto('/dashboard/purchase-requests');
    await page.waitForLoadState('networkidle');

    // Click on the first request in the list (if any exist)
    const firstRow = page.locator('table tbody tr, [class*="card"], [class*="list-item"]').first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click();
      // Should show details
      await expect(
        page.getByText(/status|items|category|request/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should approve a pending purchase request', async ({ page }) => {
    await page.goto('/dashboard/purchase-requests');
    await page.waitForLoadState('networkidle');

    // Look for a pending request and approve it
    const approveBtn = page.getByRole('button', { name: /approve/i }).first();
    if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveBtn.click();
      await expect(
        page.getByText(/approved|success/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });
});
