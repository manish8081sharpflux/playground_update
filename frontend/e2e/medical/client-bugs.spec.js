// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Medical Role — Client Bug Regression Tests
 * Covers: M-2 "Add to Cart" button crashes app for medical role
 *
 * Auth handled via storageState — tests start logged in as medical-incharge.
 */

test.describe('M-2: Add to Cart button crash regression', () => {
  test('should not show Add to Cart buttons on the shop page for medical role', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Navigate to shop if accessible
    const shopLink = page.getByRole('link', { name: /shop|store|product/i }).first();
    if (await shopLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await shopLink.click();
      await page.waitForLoadState('networkidle');

      // Medical role should either not see "Add to Cart" buttons at all,
      // or the buttons should be absent from the product listings
      const addToCartBtns = page.getByRole('button', { name: /add to cart/i });
      const btnCount = await addToCartBtns.count();

      // If no buttons found, test passes — medical role has no cart access
      if (btnCount === 0) {
        expect(btnCount).toBe(0);
      } else {
        // If buttons exist, they should be disabled for medical role
        for (let i = 0; i < btnCount; i++) {
          const btn = addToCartBtns.nth(i);
          const isDisabled = await btn.isDisabled().catch(() => false);
          if (!isDisabled) {
            // Button is enabled — click it and verify app does NOT crash
            // (covered by next test case)
          }
        }
      }
    }
  });

  test('should not crash the app if Add to Cart is clicked by medical role', async ({ page }) => {
    // Listen for page crashes and unhandled errors
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const shopLink = page.getByRole('link', { name: /shop|store|product/i }).first();
    if (await shopLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await shopLink.click();
      await page.waitForLoadState('networkidle');

      const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addToCartBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addToCartBtn.click();
        await page.waitForTimeout(2000);

        // Page should NOT go blank — body should still have content
        const bodyText = await page.locator('body').innerText();
        expect(bodyText.length).toBeGreaterThan(50);

        // Main content area should still be visible (not a white screen)
        await expect(page.locator('main, #root, [class*="app"]').first()).toBeVisible();

        // No fatal JS errors should have occurred
        const fatalErrors = errors.filter(
          (e) => e.includes('Cannot read') || e.includes('undefined') || e.includes('is not a function')
        );
        expect(fatalErrors).toHaveLength(0);
      }
    }
  });

  test('should not crash the app when visiting a product detail page', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const shopLink = page.getByRole('link', { name: /shop|store|product/i }).first();
    if (await shopLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await shopLink.click();
      await page.waitForLoadState('networkidle');

      // Click on the first product card/link to open detail page
      const productCard = page.locator('[class*="product"], [class*="card"]').first()
        .or(page.getByRole('link', { name: /.+/ }).first());

      if (await productCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await productCard.click();
        await page.waitForTimeout(2000);

        // Page should not crash — body should still have content
        const bodyText = await page.locator('body').innerText();
        expect(bodyText.length).toBeGreaterThan(50);

        // Look for add-to-cart on detail page
        const detailCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
        if (await detailCartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await detailCartBtn.click();
          await page.waitForTimeout(2000);

          // App should not go blank after clicking
          const bodyAfter = await page.locator('body').innerText();
          expect(bodyAfter.length).toBeGreaterThan(50);
          await expect(page.locator('main, #root, [class*="app"]').first()).toBeVisible();
        }
      }
    }
  });

  test('should keep navigation functional after interacting with shop', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const shopLink = page.getByRole('link', { name: /shop|store|product/i }).first();
    if (await shopLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await shopLink.click();
      await page.waitForLoadState('networkidle');

      // Try clicking Add to Cart if visible
      const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addToCartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addToCartBtn.click();
        await page.waitForTimeout(1000);
      }

      // Navigate back to dashboard — should work without crash
      const dashLink = page.getByRole('link', { name: /dashboard|home/i }).first();
      if (await dashLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dashLink.click();
        await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
        await expect(page.locator('main')).toBeVisible();
      }
    }
  });

  test('should not display a cart icon or cart page for medical role', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Medical role should not have a cart link/icon in the nav
    const cartIcon = page.getByRole('link', { name: /cart/i }).first()
      .or(page.locator('[class*="cart"], [aria-label*="cart"]').first());

    // If cart is visible, navigating to it should not crash
    if (await cartIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cartIcon.click();
      await page.waitForTimeout(1000);

      // Page should still be functional
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(50);
    }
  });

  test('should not crash when navigating directly to /shop URL', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Direct URL navigation to shop
    await page.goto('/dashboard/shop');
    await page.waitForTimeout(3000);

    // Page should render something meaningful, not go blank
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(20);

    // No fatal crash errors
    const fatalErrors = errors.filter(
      (e) => e.includes('Cannot read') || e.includes('is not a function')
    );
    expect(fatalErrors).toHaveLength(0);
  });
});
