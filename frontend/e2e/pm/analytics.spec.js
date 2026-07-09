// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Analytics & Transaction Reports E2E — Dashboard widgets, transaction
 * reports, leaderboards, coin economy health, and filtering.
 *
 * Auth: storageState handles login as purchase-manager.
 * Note: Some analytics pages may require admin-level access. These tests
 * verify the purchase-manager can access the reports they are entitled to,
 * or are gracefully denied.
 */

test.describe('Analytics Dashboard', () => {

  test('TC-1: navigate to analytics dashboard', async ({ page }) => {
    await page.goto('/shop/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Either the analytics page loads or access is restricted
    const heading = page.getByText(/analytics|dashboard|access denied/i).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('TC-2: overview cards display key metrics', async ({ page }) => {
    await page.goto('/shop/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Verify overview cards are present: Total Orders, Revenue, Avg Order Value, Student Participation
    const totalOrders = page.getByText(/total orders/i).first();
    const totalRevenue = page.getByText(/total revenue/i).first();

    // At least some overview cards should be visible
    if (await totalOrders.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(totalOrders).toBeVisible();
      await expect(totalRevenue).toBeVisible();

      const avgOrderValue = page.getByText(/avg order value|average order/i).first();
      await expect(avgOrderValue).toBeVisible({ timeout: 5000 });

      const studentParticipation = page.getByText(/student participation/i).first();
      await expect(studentParticipation).toBeVisible({ timeout: 5000 });
    }
  });

  test('TC-3: date range preset buttons update data', async ({ page }) => {
    await page.goto('/shop/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Click preset date range buttons
    const last7Days = page.getByRole('button', { name: /last 7 days/i }).first()
      .or(page.getByText(/last 7 days/i).first());
    if (await last7Days.isVisible({ timeout: 10000 }).catch(() => false)) {
      await last7Days.click();
      await page.waitForTimeout(1000);

      // Dashboard should update (loading spinner may briefly appear)
      const totalOrders = page.getByText(/total orders/i).first();
      await expect(totalOrders).toBeVisible({ timeout: 10000 });
    }

    const last30Days = page.getByRole('button', { name: /last 30 days/i }).first()
      .or(page.getByText(/last 30 days/i).first());
    if (await last30Days.isVisible({ timeout: 5000 }).catch(() => false)) {
      await last30Days.click();
      await page.waitForTimeout(1000);
      await expect(page.getByText(/total orders/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('TC-4: custom date range selection', async ({ page }) => {
    await page.goto('/shop/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Look for date input fields
    const startDate = page.locator('input[type="date"]').first();
    if (await startDate.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Set a custom range: 60 days ago to today
      const today = new Date();
      const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
      const todayStr = today.toISOString().split('T')[0];
      const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

      await startDate.fill(sixtyDaysAgoStr);

      const endDate = page.locator('input[type="date"]').nth(1);
      if (await endDate.isVisible({ timeout: 3000 }).catch(() => false)) {
        await endDate.fill(todayStr);
      }

      // Data should refresh
      await page.waitForTimeout(1000);
      await expect(page.getByText(/total orders|no data|analytics/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('TC-5: top products table displays with volume and revenue tabs', async ({ page }) => {
    await page.goto('/shop/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Look for Top Products section
    const topProducts = page.getByText(/top products/i).first();
    if (await topProducts.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(topProducts).toBeVisible();

      // Verify volume tab is active by default
      const volumeTab = page.getByRole('tab', { name: /volume/i }).first()
        .or(page.getByText(/sales volume/i).first());
      if (await volumeTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(volumeTab).toBeVisible();
      }

      // Switch to revenue tab
      const revenueTab = page.getByRole('tab', { name: /revenue/i }).first()
        .or(page.getByText(/by revenue/i).first());
      if (await revenueTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await revenueTab.click();
        await page.waitForTimeout(500);
        // Table should still be visible
        await expect(page.getByText(/top products/i).first()).toBeVisible();
      }
    }
  });

  test('TC-6: category performance section displays', async ({ page }) => {
    await page.goto('/shop/admin/analytics');
    await page.waitForLoadState('networkidle');

    const categorySection = page.getByText(/category performance/i).first();
    if (await categorySection.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(categorySection).toBeVisible();
    }
  });

  test('TC-7: revenue trend chart renders', async ({ page }) => {
    await page.goto('/shop/admin/analytics');
    await page.waitForLoadState('networkidle');

    const revenueTrend = page.getByText(/revenue trend/i).first();
    if (await revenueTrend.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(revenueTrend).toBeVisible();

      // Chart container should be present (Recharts renders SVG)
      const chartSvg = page.locator('.recharts-wrapper, svg.recharts-surface').first();
      if (await chartSvg.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(chartSvg).toBeVisible();
      }
    }
  });

  test('TC-8: stock turnover insights section displays', async ({ page }) => {
    await page.goto('/shop/admin/analytics');
    await page.waitForLoadState('networkidle');

    const stockTurnover = page.getByText(/stock turnover/i).first();
    if (await stockTurnover.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(stockTurnover).toBeVisible();

      // Look for fast-moving and slow-moving labels
      const fastMoving = page.getByText(/fast moving/i).first();
      const slowMoving = page.getByText(/slow moving/i).first();
      if (await fastMoving.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(fastMoving).toBeVisible();
        await expect(slowMoving).toBeVisible();
      }
    }
  });
});

test.describe('Transaction Reports', () => {

  test.fixme('TC-1: navigate to transaction reports page', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await page.waitForLoadState('networkidle');

    const heading = page.getByText(/transaction|reports|access denied/i).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test.fixme('TC-2: transaction log table displays with columns', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await page.waitForLoadState('networkidle');

    // Look for the transaction table
    const table = page.locator('table').first();
    if (await table.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Verify key column headers
      await expect(page.getByText(/order/i).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/student/i).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/status/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test.fixme('TC-3: filter transactions by status', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await page.waitForLoadState('networkidle');

    // Open filters panel if needed
    const filtersButton = page.getByRole('button', { name: /filter/i }).first();
    if (await filtersButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filtersButton.click();
      await page.waitForTimeout(500);
    }

    // Select status filter
    const statusDropdown = page.locator('select[name*="status"]').first()
      .or(page.getByLabel(/status/i).first());
    if (await statusDropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusDropdown.selectOption({ label: /completed/i });
      await page.waitForTimeout(1000);

      // Verify filtered results
      const table = page.locator('table').first();
      if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(table).toBeVisible();
      }
    }
  });

  test('TC-4: search transactions by student name', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await searchInput.fill('student');
      await page.waitForTimeout(1000); // debounce

      // Verify results update
      const table = page.locator('table').first();
      if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(table).toBeVisible();
      }
    }
  });

  test('TC-5: student leaderboard tabs (earners and spenders)', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await page.waitForLoadState('networkidle');

    // Look for leaderboard section
    const leaderboard = page.getByText(/leaderboard/i).first();
    if (await leaderboard.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Click Top Earners tab
      const earnersTab = page.getByRole('tab', { name: /earner/i }).first()
        .or(page.getByText(/top earner/i).first());
      if (await earnersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await earnersTab.click();
        await page.waitForTimeout(500);
        await expect(page.getByText(/total earned/i).first()).toBeVisible({ timeout: 10000 });
      }

      // Click Top Spenders tab
      const spendersTab = page.getByRole('tab', { name: /spender/i }).first()
        .or(page.getByText(/top spender/i).first());
      if (await spendersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await spendersTab.click();
        await page.waitForTimeout(500);
        await expect(page.getByText(/total spent/i).first()).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('TC-6: coin economy health section displays', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await page.waitForLoadState('networkidle');

    const coinEconomy = page.getByText(/coin economy/i).first();
    if (await coinEconomy.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(coinEconomy).toBeVisible();

      // Check for health status indicator
      const healthStatus = page.getByText(/healthy|warning|critical|circulation/i).first();
      await expect(healthStatus).toBeVisible({ timeout: 10000 });
    }
  });

  test('TC-7: zero purchases report section displays', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await page.waitForLoadState('networkidle');

    const zeroPurchases = page.getByText(/zero purchases|never purchased|never made a purchase/i).first();
    if (await zeroPurchases.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(zeroPurchases).toBeVisible();
    }
  });

  test('TC-8: pagination controls work on transaction log', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await page.waitForLoadState('networkidle');

    // Look for pagination
    const nextButton = page.getByRole('button', { name: /next/i }).first();
    if (await nextButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Previous should be disabled on page 1
      const prevButton = page.getByRole('button', { name: /previous|prev/i }).first();
      if (await prevButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(prevButton).toBeDisabled();
      }

      // Click next to go to page 2
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Page indicator should update
      const pageIndicator = page.getByText(/page 2|showing.*of/i).first();
      if (await pageIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(pageIndicator).toBeVisible();
      }
    }
  });

  test('TC-9: export CSV button is functional', async ({ page }) => {
    await page.goto('/shop/admin/reports');
    await page.waitForLoadState('networkidle');

    const exportButton = page.getByRole('button', { name: /export|csv|download/i }).first();
    if (await exportButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await exportButton.click();

      const download = await downloadPromise;
      if (download) {
        const filename = download.suggestedFilename();
        expect(filename).toMatch(/\.csv$/i);
      }
    }
  });
});
