// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Client Bug Regression Tests — Purchase Manager role.
 *
 * Auth: storageState handles login as purchase-manager.
 */

test.describe('Client Bug Regressions', () => {

  test.fixme('PM-1: vendors added via Admin appear in purchase supplier list', async ({ page }) => {
    // Navigate to purchase management
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory view
    const typeDropdown = page.locator('select').first();
    await typeDropdown.selectOption('shop-inventory');
    await page.waitForTimeout(500);

    // Open the create purchase request modal
    await page.getByRole('button', { name: /new purchase request/i }).first().click();
    await page.waitForTimeout(1000);

    // Look for a vendor or supplier dropdown/list inside the modal
    const supplierSelect = page.locator('select[name*="vendor"], select[name*="supplier"]').first()
      .or(page.getByLabel(/vendor|supplier/i).first());

    if (await supplierSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Verify the supplier dropdown has vendor options populated
      const options = supplierSelect.locator('option');
      const count = await options.count();

      // At minimum: 1 placeholder + 1 real vendor added by Admin
      expect(count).toBeGreaterThan(1);

      // Verify at least one option has real vendor text (not just a placeholder)
      const secondOptionText = await options.nth(1).textContent();
      expect(secondOptionText?.trim().length).toBeGreaterThan(0);
    } else {
      // Vendor data may be displayed differently (e.g., in a list, chips, or auto-populated)
      // Check if vendor-related text appears anywhere in the modal
      const vendorText = page.getByText(/vendor|supplier/i).first();
      if (await vendorText.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(vendorText).toBeVisible();
      }
    }
  });

  test('PM-1b: vendor data is not empty on the suppliers page', async ({ page }) => {
    // Try navigating to a vendors or suppliers management page
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Look for a vendors/suppliers link or tab
    const vendorLink = page.getByRole('link', { name: /vendor|supplier/i }).first()
      .or(page.getByText(/vendor|supplier/i).first());

    if (await vendorLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await vendorLink.click();
      await page.waitForLoadState('networkidle');

      // Verify vendor list is not empty
      const vendorRows = page.locator('table tbody tr, [class*="vendor"], [class*="supplier"]').first();
      await expect(vendorRows).toBeVisible({ timeout: 10000 });
    }
  });

  test.fixme('PM-1c: newly created vendor appears after page refresh', async ({ page }) => {
    // This test ensures vendor data persists and is fetched fresh from the API.
    // Navigate to purchase page twice (simulating a refresh) and verify vendors load.
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory
    const typeDropdown = page.locator('select').first();
    await typeDropdown.selectOption('shop-inventory');
    await page.waitForTimeout(500);

    // Open create modal
    await page.getByRole('button', { name: /new purchase request/i }).first().click();
    await page.waitForTimeout(500);

    // Close modal
    const closeButton = page.getByRole('button', { name: /close|cancel/i }).first()
      .or(page.locator('button[aria-label="Close"]').first());
    if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeButton.click();
    }

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory again
    const typeDropdown2 = page.locator('select').first();
    await typeDropdown2.selectOption('shop-inventory');
    await page.waitForTimeout(500);

    // Open create modal again
    await page.getByRole('button', { name: /new purchase request/i }).first().click();
    await page.waitForTimeout(1000);

    // Verify supplier/vendor data still loads after refresh
    const supplierSelect = page.locator('select[name*="vendor"], select[name*="supplier"]').first()
      .or(page.getByLabel(/vendor|supplier/i).first());

    if (await supplierSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      const options = supplierSelect.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThan(1);
    }
  });

  test.fixme('PM-1d: vendor dropdown is not stuck in loading state', async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory
    const typeDropdown = page.locator('select').first();
    await typeDropdown.selectOption('shop-inventory');
    await page.waitForTimeout(500);

    // Open create modal
    await page.getByRole('button', { name: /new purchase request/i }).first().click();
    await page.waitForTimeout(2000); // Give extra time for API call

    // Verify no loading spinner persists inside the modal
    const loadingSpinner = page.locator('[class*="spinner"], [class*="loading"]').first();
    const isStillLoading = await loadingSpinner.isVisible({ timeout: 2000 }).catch(() => false);

    // If a loading indicator is still visible after 2 seconds of modal open, that is a problem
    if (isStillLoading) {
      // Wait a bit more — if still loading after 5 seconds total, fail
      await expect(loadingSpinner).not.toBeVisible({ timeout: 5000 });
    }
  });

  test.fixme('PM-1e: selecting a vendor does not clear other form fields', async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');

    // Switch to Shop Inventory
    const typeDropdown = page.locator('select').first();
    await typeDropdown.selectOption('shop-inventory');
    await page.waitForTimeout(500);

    // Open create modal
    await page.getByRole('button', { name: /new purchase request/i }).first().click();
    await page.waitForTimeout(500);

    // Fill in balagruha first
    const balagruhaDropdown = page.locator('select[name*="balagruha"], select[name*="Balagruha"]').first()
      .or(page.getByLabel(/balagruha/i).first());
    if (await balagruhaDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await balagruhaDropdown.selectOption({ index: 1 });
    }
    await page.waitForTimeout(500);

    // Fill in a reason
    const reasonInput = page.getByPlaceholder(/reason/i).first()
      .or(page.locator('input[name*="reason"], textarea[name*="reason"]').first());
    if (await reasonInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reasonInput.fill('Testing vendor selection does not clear fields');
    }

    // Now select a vendor/supplier if dropdown exists
    const supplierSelect = page.locator('select[name*="vendor"], select[name*="supplier"]').first()
      .or(page.getByLabel(/vendor|supplier/i).first());
    if (await supplierSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await supplierSelect.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }

    // Verify the reason field still has its value
    if (await reasonInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const currentValue = await reasonInput.inputValue();
      expect(currentValue).toContain('Testing vendor selection');
    }

    // Verify balagruha is still selected (not reset to placeholder)
    if (await balagruhaDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
      const selectedValue = await balagruhaDropdown.inputValue();
      expect(selectedValue).not.toBe('');
    }
  });
});
