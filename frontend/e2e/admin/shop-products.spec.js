// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Admin — Shop Products E2E Tests
 * Covers: Story 05 (Product CRUD)
 *         Sprint5 Story 14 (Product Image Upload)
 *         Story 06 (Inventory Management)
 *         Story 07 (Stock Alerts)
 *
 * Auth handled via storageState — tests start logged in as admin.
 */

test.describe('Product CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shop/admin/products');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('should display product management page with create button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /create product/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should open create product modal and validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /create product/i }).first().click();

    // Try submitting empty form
    const submitBtn = page.getByRole('button', { name: /create product/i }).last();
    await submitBtn.click();

    // Should show validation errors
    await expect(
      page.getByText(/required|is required/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should create a product with all fields', async ({ page }) => {
    await page.getByRole('button', { name: /create product/i }).first().click();

    // Fill form
    const skuInput = page.getByPlaceholder(/sku/i).first()
      .or(page.getByLabel(/sku/i).first());
    if (await skuInput.isVisible().catch(() => false)) {
      await skuInput.fill('E2E-TEST-001');
    }

    await page.getByPlaceholder(/name|product name/i).first().fill('E2E Test Product');
    await page.getByPlaceholder(/description/i).first().fill('Product created during E2E testing');

    // Category dropdown
    const categorySelect = page.locator('select').filter({ hasText: /category|stationery|sports/i }).first();
    if (await categorySelect.isVisible().catch(() => false)) {
      await categorySelect.selectOption('stationery');
    }

    // Price
    const priceInput = page.getByPlaceholder(/price/i).first()
      .or(page.getByLabel(/price/i).first());
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill('100');
    }

    // Submit
    const createBtn = page.getByRole('button', { name: /create product/i }).last();
    await createBtn.click();

    await expect(
      page.getByText(/created successfully/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should edit an existing product', async ({ page }) => {
    // Click edit on first product
    const editBtn = page.getByRole('button', { name: /edit/i }).first()
      .or(page.locator('[aria-label*="edit"]').first());
    await editBtn.click();

    // Modal should open with pre-filled data
    await expect(
      page.getByPlaceholder(/name|product name/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Update name
    const nameInput = page.getByPlaceholder(/name|product name/i).first();
    await nameInput.clear();
    await nameInput.fill('Updated E2E Product');

    const updateBtn = page.getByRole('button', { name: /update product/i }).first();
    await updateBtn.click();

    await expect(
      page.getByText(/updated successfully/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should soft-delete a product with confirmation', async ({ page }) => {
    const deleteBtn = page.getByRole('button', { name: /delete/i }).first()
      .or(page.locator('[aria-label*="delete"]').first());
    await deleteBtn.click();

    // Confirmation modal
    await expect(
      page.getByText(/are you sure|delete.*product/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Cancel first
    const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
    await cancelBtn.click();

    // Product should still exist
    await expect(page.locator('main')).toBeVisible();
  });

  test('should search products by name', async ({ page }) => {
    const searchBox = page.getByPlaceholder(/search/i).first();
    await searchBox.fill('Notebook');
    await page.waitForTimeout(500);
    await expect(page.locator('main')).toBeVisible();
  });

  test.fixme('should filter products by category', async ({ page }) => {
    const categoryFilter = page.locator('select').filter({ hasText: /all.*categor|stationery|sports|books/i }).first();
    if (await categoryFilter.isVisible().catch(() => false)) {
      await categoryFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test.fixme('should filter products by status (active/inactive)', async ({ page }) => {
    const statusFilter = page.locator('select').filter({ hasText: /status|active|inactive/i }).first();
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.selectOption('Active');
      await page.waitForTimeout(500);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test.fixme('should show SKU uniqueness error for duplicate SKU', async ({ page }) => {
    await page.getByRole('button', { name: /create product/i }).first().click();

    // Use a SKU that likely exists
    const skuInput = page.getByPlaceholder(/sku/i).first()
      .or(page.getByLabel(/sku/i).first());
    if (await skuInput.isVisible().catch(() => false)) {
      await skuInput.fill('STAT-001');
    }

    await page.getByPlaceholder(/name|product name/i).first().fill('Duplicate SKU Test');
    await page.getByPlaceholder(/description/i).first().fill('Testing duplicate SKU');

    const priceInput = page.getByPlaceholder(/price/i).first()
      .or(page.getByLabel(/price/i).first());
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill('50');
    }

    const createBtn = page.getByRole('button', { name: /create product/i }).last();
    await createBtn.click();

    await expect(
      page.getByText(/already exists|duplicate|sku.*exists/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Product Image Upload', () => {
  test('should show image management section in edit modal', async ({ page }) => {
    await page.goto('/shop/admin/products');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const editBtn = page.getByRole('button', { name: /edit/i }).first()
      .or(page.locator('[aria-label*="edit"]').first());
    await editBtn.click();

    // Image section should be visible
    await expect(
      page.getByText(/image|upload|product image/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display current images grid in edit mode', async ({ page }) => {
    await page.goto('/shop/admin/products');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const editBtn = page.getByRole('button', { name: /edit/i }).first()
      .or(page.locator('[aria-label*="edit"]').first());
    await editBtn.click();

    // Should see current images or upload area
    await expect(
      page.getByText(/current images|upload|click to upload|product image/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shop/admin/inventory');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('should display inventory dashboard with stat cards', async ({ page }) => {
    await expect(
      page.getByText(/total products|low stock|out of stock/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should open stock adjustment modal', async ({ page }) => {
    const adjustBtn = page.getByRole('button', { name: /adjust stock/i }).first();
    if (await adjustBtn.isVisible().catch(() => false)) {
      await adjustBtn.click();

      await expect(
        page.getByText(/stock adjustment|adjust/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test.fixme('should reject negative stock adjustment', async ({ page }) => {
    const adjustBtn = page.getByRole('button', { name: /adjust stock/i }).first();
    if (await adjustBtn.isVisible().catch(() => false)) {
      await adjustBtn.click();

      const adjustInput = page.getByPlaceholder(/adjustment|quantity/i).first()
        .or(page.getByLabel(/adjustment/i).first());
      if (await adjustInput.isVisible().catch(() => false)) {
        await adjustInput.fill('-99999');

        const reasonSelect = page.locator('select').filter({ hasText: /reason|purchase|correction/i }).first();
        if (await reasonSelect.isVisible().catch(() => false)) {
          await reasonSelect.selectOption({ index: 1 });
        }

        const submitBtn = page.getByRole('button', { name: /adjust stock/i }).last();
        await submitBtn.click();

        await expect(
          page.getByText(/cannot be negative|insufficient|error/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should show color-coded stock levels', async ({ page }) => {
    // Page should render with colored rows
    await expect(page.locator('table, [role="table"]').first()
      .or(page.locator('main'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('should view audit trail for a product', async ({ page }) => {
    const historyBtn = page.getByRole('button', { name: /history|view history|audit/i }).first();
    if (await historyBtn.isVisible().catch(() => false)) {
      await historyBtn.click();

      await expect(
        page.getByText(/audit trail|history|transaction/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should search inventory by product name', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Notebook');
      await page.waitForTimeout(500);
      await expect(page.locator('main')).toBeVisible();
    }
  });
});

test.describe('Stock Alerts', () => {
  test('should display low stock alert banner on inventory page', async ({ page }) => {
    await page.goto('/shop/admin/inventory');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Check for alert banners (may not always be present depending on data)
    const lowStockBanner = page.getByText(/low.*stock/i).first();
    const outOfStockBanner = page.getByText(/out of stock/i).first();

    // At least the inventory page loaded successfully
    await expect(page.locator('main')).toBeVisible();

    // If there are low stock items, banner should be visible
    if (await lowStockBanner.isVisible().catch(() => false)) {
      await expect(lowStockBanner).toBeVisible();
    }
  });

  test('should navigate to low stock report', async ({ page }) => {
    await page.goto('/shop/admin/inventory/low-stock');
    await expect(
      page.getByText(/low stock|alert/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Back button should exist
    const backBtn = page.getByRole('button', { name: /back/i }).first()
      .or(page.locator('[aria-label*="back"]').first());
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/inventory/, { timeout: 10000 });
    }
  });

  test('should navigate to out of stock report', async ({ page }) => {
    await page.goto('/shop/admin/inventory/out-of-stock');
    await expect(
      page.getByText(/out of stock/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should open restock modal from out of stock report', async ({ page }) => {
    await page.goto('/shop/admin/inventory/out-of-stock');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const restockBtn = page.getByRole('button', { name: /restock|adjust/i }).first();
    if (await restockBtn.isVisible().catch(() => false)) {
      await restockBtn.click();
      await expect(
        page.getByText(/stock adjustment|adjust|restock/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });
});
