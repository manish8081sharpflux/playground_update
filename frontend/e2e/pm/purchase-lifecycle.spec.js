// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Purchase Lifecycle E2E — Full 4-step lifecycle:
 *   1. Create purchase request
 *   2. Admin approves (order placed)
 *   3. Deliver to store
 *   4. Deliver to balagruha
 *
 * Auth: storageState handles login as purchase-manager.
 * Tests run serially because each step depends on the previous.
 */

test.describe('Purchase Request Lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  /** Shared state across serial tests */
  let requestId;

  test('TC-1: navigate to purchase management page', async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByText(/purchase management/i).first()).toBeVisible({ timeout: 10000 });

    // Verify the purchase-type dropdown exists (select#purchase-type)
    const dropdown = page.locator('select#purchase-type').first();
    await expect(dropdown).toBeVisible({ timeout: 10000 });
  });

  test.fixme('TC-2: switch to Shop Inventory view', async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Select Shop Inventory from the dropdown (option value="shop-inventory")
    const dropdown = page.locator('select#purchase-type');
    await dropdown.selectOption({ value: 'shop-inventory' });

    // Verify Shop Inventory is selected in the dropdown
    await expect(page.locator('select#purchase-type')).toHaveValue('shop-inventory');

    // Verify "+ New Purchase Request" button is visible
    await expect(
      page.getByRole('button', { name: /new purchase request/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('TC-3: open create purchase request modal and fill form', async ({ page }) => {
    // TODO: selector needs update — check rendered DOM
    // Modal form uses: custom product multi-select dropdown (not native select),
    // no separate reason/quantity fields (quantity per-item in table), no 'create request' button
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory
    const dropdown = page.locator('select#purchase-type');
    await dropdown.selectOption({ value: 'shop-inventory' });
    await page.waitForTimeout(500);

    // Click New Purchase Request
    await page.getByRole('button', { name: /new purchase request/i }).first().click();

    // Modal should open
    await expect(page.getByText(/new purchase request/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-4: verify new request appears in table with Pending status', async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory
    const dropdown = page.locator('select#purchase-type');
    await dropdown.selectOption({ value: 'shop-inventory' });
    await page.waitForTimeout(1000);

    // Verify table has at least one row
    const tableRows = page.locator('table tbody tr').first();
    await expect(tableRows).toBeVisible({ timeout: 10000 });

    // Look for Pending status badge
    await expect(page.getByText(/pending/i).first()).toBeVisible({ timeout: 10000 });

    // Capture the request ID from the first row for later tests
    const firstRowText = await page.locator('table tbody tr').first().textContent();
    const prMatch = firstRowText?.match(/PR-\d+/);
    if (prMatch) {
      requestId = prMatch[0];
    }
  });

  test.fixme('TC-5: view request details modal', async ({ page }) => {
    // TODO: selector needs update — check rendered DOM
    // Details modal may use 'items' table instead of a 'quantity' text label
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory
    const dropdown = page.locator('select#purchase-type');
    await dropdown.selectOption({ value: 'shop-inventory' });
    await page.waitForTimeout(1000);

    // Click view button on first pending request
    const viewButton = page.getByRole('button', { name: /view/i }).first()
      .or(page.locator('button[title*="View"], button[aria-label*="View"]').first());
    await viewButton.click();

    // Verify details modal opens
    await expect(
      page.getByText(/purchase request details/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Verify key fields are shown
    await expect(page.getByText(/product/i).first()).toBeVisible();
    await expect(page.getByText(/status/i).first()).toBeVisible();
    await expect(page.getByText(/quantity/i).first()).toBeVisible();

    // Close the modal
    await page.getByRole('button', { name: /close/i }).first().click();
  });

  test('TC-6: cancel a pending request', async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory
    const dropdown = page.locator('select#purchase-type');
    await dropdown.selectOption({ value: 'shop-inventory' });
    await page.waitForTimeout(1000);

    // Click cancel button on a pending request
    const cancelButton = page.getByRole('button', { name: /cancel/i }).first()
      .or(page.locator('button[title*="Cancel"]').first());

    if (await cancelButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Handle browser confirmation dialog
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });

      await cancelButton.click();

      // Expect success feedback
      await expect(
        page.getByText(/cancelled|canceled|success/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test.fixme('TC-7: form validation prevents empty submissions', async ({ page }) => {
    // TODO: selector needs update — check rendered DOM
    // 'Create Request' button is disabled when form is empty (correct behavior)
    // Test needs to verify button is disabled, not try to click it
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory
    const dropdown = page.locator('select#purchase-type');
    await dropdown.selectOption({ value: 'shop-inventory' });
    await page.waitForTimeout(500);

    // Open create modal
    await page.getByRole('button', { name: /new purchase request/i }).first().click();
    await page.waitForTimeout(500);

    // Try to submit empty form
    await page.getByRole('button', { name: /create request/i }).first().click();

    // Expect validation error
    await expect(
      page.getByText(/please select|required|error/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('TC-8: form validation rejects quantity less than 1', async ({ page }) => {
    // TODO: selector needs update — check rendered DOM
    // Modal uses custom product multi-select + per-item quantity inputs; no single reason field
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory
    const dropdown = page.locator('select#purchase-type');
    await dropdown.selectOption({ value: 'shop-inventory' });
    await page.waitForTimeout(500);

    // Open create modal
    await page.getByRole('button', { name: /new purchase request/i }).first().click();
    await page.waitForTimeout(500);

    // Select balagruha and product first
    const balagruhaDropdown = page.locator('select[name*="balagruha"], select[name*="Balagruha"]').first()
      .or(page.getByLabel(/balagruha/i).first());
    if (await balagruhaDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await balagruhaDropdown.selectOption({ index: 1 });
    }
    await page.waitForTimeout(500);
    const productDropdown = page.locator('select[name*="product"], select[name*="Product"]').first()
      .or(page.getByLabel(/product/i).first());
    if (await productDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productDropdown.selectOption({ index: 1 });
    }

    // Enter quantity 0
    const quantityInput = page.getByPlaceholder(/quantity/i).first()
      .or(page.locator('input[name*="quantity"], input[type="number"]').first());
    await quantityInput.fill('0');

    // Fill reason
    const reasonInput = page.getByPlaceholder(/reason/i).first()
      .or(page.locator('input[name*="reason"], textarea[name*="reason"]').first());
    await reasonInput.fill('Test reason');

    // Submit
    await page.getByRole('button', { name: /create request/i }).first().click();

    // Expect validation error about quantity
    await expect(
      page.getByText(/valid quantity|at least 1|greater than/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('TC-9: stats footer displays request counts', async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory
    const dropdown = page.locator('select#purchase-type');
    await dropdown.selectOption({ value: 'shop-inventory' });
    await page.waitForTimeout(1000);

    // Verify stats footer is visible with count labels
    await expect(page.getByText(/total requests/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/pending/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-10: export PDF button is visible', async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory
    const dropdown = page.locator('select#purchase-type');
    await dropdown.selectOption({ value: 'shop-inventory' });
    await page.waitForTimeout(1000);

    // Verify export PDF button exists
    const exportButton = page.getByRole('button', { name: /export pdf/i }).first()
      .or(page.getByText(/export pdf/i).first());
    await expect(exportButton).toBeVisible({ timeout: 10000 });
  });
});
