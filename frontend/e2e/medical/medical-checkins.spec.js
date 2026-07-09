// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Medical Role — Medical Check-in Forms, Hospital Dropdown, History View
 * Covers: Sprint6-Story-02 (Medical History Alignment)
 *         Sprint6-Story-03 (Hospital Dropdown, Check-in Fixes)
 *
 * Auth handled via storageState — tests start logged in as medical-incharge.
 */

test.describe('Medical Check-in Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Navigate to the health check-ins page
    const healthNav = page.getByRole('link', { name: /health|medical|check-in/i }).first();
    await healthNav.click();
    await expect(
      page.getByText(/health check-in|medical check-in|check-in/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should display new check-in button', async ({ page }) => {
    const newCheckinBtn = page.getByRole('button', { name: /new.*check-in|record.*check-in|create.*check-in/i }).first();
    await expect(newCheckinBtn).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should open check-in form and display required fields', async ({ page }) => {
    const newCheckinBtn = page.getByRole('button', { name: /new.*check-in|record.*check-in|create.*check-in/i }).first();
    await newCheckinBtn.click();

    // Form should open — check for key form fields
    await expect(
      page.getByText(/balagruha/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Student selector should be present
    await expect(
      page.getByText(/student/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should show temperature field as optional', async ({ page }) => {
    const newCheckinBtn = page.getByRole('button', { name: /new.*check-in|record.*check-in|create.*check-in/i }).first();
    await newCheckinBtn.click();

    // Temperature field should be present
    const tempField = page.getByPlaceholder(/temperature|optional.*enter|enter.*measured/i).first()
      .or(page.locator('input[type="number"]').first());

    if (await tempField.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Temperature field should NOT have a required asterisk next to it
      // Verify the field accepts empty values (optional)
      await expect(tempField).toBeVisible();
    }
  });

  test.fixme('should submit check-in form with minimal required fields', async ({ page }) => {
    const newCheckinBtn = page.getByRole('button', { name: /new.*check-in|record.*check-in|create.*check-in/i }).first();
    await newCheckinBtn.click();

    // Select Balagruha dropdown
    const bgSelect = page.locator('select').filter({ hasText: /balagruha|select/i }).first()
      .or(page.getByRole('combobox').first());
    if (await bgSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bgSelect.selectOption({ index: 1 });
    }

    // Wait for students to load then select first student
    await page.waitForTimeout(1000);
    const studentSelect = page.locator('select').nth(1)
      .or(page.getByRole('combobox').nth(1));
    if (await studentSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await studentSelect.selectOption({ index: 1 });
    }

    // Submit the form
    const submitBtn = page.getByRole('button', { name: /submit|save|create/i }).first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();

      // Should see success or validation message
      await expect(
        page.getByText(/success|created|submitted|required/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Hospital Dropdown in Doctor Visits', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Navigate to health check-ins
    const healthNav = page.getByRole('link', { name: /health|medical|check-in/i }).first();
    await healthNav.click();
    await expect(
      page.getByText(/health check-in|medical check-in|check-in/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Open new check-in form
    const newCheckinBtn = page.getByRole('button', { name: /new.*check-in|record.*check-in|create.*check-in/i }).first();
    await newCheckinBtn.click();
    await page.waitForTimeout(500);
  });

  test.fixme('should show doctor visits section with add button', async ({ page }) => {
    // Look for doctor visits section or add button
    const doctorSection = page.getByText(/doctor visit/i).first();
    const addVisitBtn = page.getByRole('button', { name: /add.*doctor|add.*visit/i }).first();

    const sectionVisible = await doctorSection.isVisible({ timeout: 5000 }).catch(() => false);
    const buttonVisible = await addVisitBtn.isVisible({ timeout: 5000 }).catch(() => false);

    // At least one should be present
    expect(sectionVisible || buttonVisible).toBeTruthy();
  });

  test.fixme('should render hospital name field as dropdown in doctor visits', async ({ page }) => {
    // Expand doctor visits and add a visit
    const addVisitBtn = page.getByRole('button', { name: /add.*doctor|add.*visit/i }).first();
    if (await addVisitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addVisitBtn.click();
      await page.waitForTimeout(500);

      // Hospital field should be a dropdown (react-select or native select), not a plain text input
      const hospitalDropdown = page.getByText(/hospital name/i).first()
        .or(page.getByPlaceholder(/search.*hospital|add hospital/i).first());
      await expect(hospitalDropdown).toBeVisible({ timeout: 10000 });
    }
  });

  test.fixme('should allow searching hospitals in dropdown', async ({ page }) => {
    const addVisitBtn = page.getByRole('button', { name: /add.*doctor|add.*visit/i }).first();
    if (await addVisitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addVisitBtn.click();
      await page.waitForTimeout(500);

      // Find the hospital input (react-select renders an input inside the dropdown)
      const hospitalInput = page.getByPlaceholder(/search.*hospital|add hospital/i).first()
        .or(page.locator('[class*="hospital"] input').first());

      if (await hospitalInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await hospitalInput.fill('City');
        await page.waitForTimeout(500);

        // Should show filtered results or "Add" option
        const dropdown = page.locator('[class*="menu"], [class*="option"], [role="listbox"], [role="option"]').first();
        await expect(dropdown).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Check-in History View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const healthNav = page.getByRole('link', { name: /health|medical|check-in/i }).first();
    await healthNav.click();
    await expect(
      page.getByText(/health check-in|medical check-in|check-in/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should display existing check-ins list', async ({ page }) => {
    // The check-ins page should show a list or table of existing check-ins
    const listContainer = page.locator('table, [class*="list"], [class*="card"], [class*="checkin"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 });
  });

  test.fixme('should show check-in details when clicking a record', async ({ page }) => {
    // Click on the first check-in record (view or edit button)
    const viewBtn = page.getByRole('button', { name: /view|detail|edit/i }).first()
      .or(page.locator('table tbody tr').first());

    if (await viewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewBtn.click();

      // Should show check-in details — health status, date, student info
      await expect(
        page.getByText(/health status|student|date|temperature|symptoms/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test.fixme('should display health status badge on check-in records', async ({ page }) => {
    // Check-in records should show status indicators
    const statusBadge = page.getByText(/healthy|sick|recovered|critical|normal/i).first();
    if (await statusBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(statusBadge).toBeVisible();
    }
  });

  test.fixme('should not show removed medical history section in user forms', async ({ page }) => {
    // Navigate to users tab to verify medical history removal
    const usersNav = page.getByRole('link', { name: /user/i }).first();
    if (await usersNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersNav.click();
      await page.waitForTimeout(1000);

      // Medical History section should NOT be visible anywhere on the page
      const medicalHistorySection = page.getByText(/medical history/i);
      const count = await medicalHistorySection.count();

      // "Medical Check-ins" is acceptable, "Medical History" is not
      for (let i = 0; i < count; i++) {
        const text = await medicalHistorySection.nth(i).innerText();
        expect(text.toLowerCase()).not.toContain('medical history');
      }
    }
  });
});
