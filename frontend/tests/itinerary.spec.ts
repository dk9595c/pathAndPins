import { test, expect } from '@playwright/test';

test.describe('Itinerary and Map E2E Tests', () => {
  test('should switch dates and verify active state using accessible labels', async ({ page }) => {
    // Mock the regions endpoint so map outlines load cleanly
    await page.route('**/api/regions?type=county', async (route) => {
      await route.fulfill({ status: 200, json: { type: 'FeatureCollection', features: [] } });
    });
    
    await page.goto('/');

    // 1. Find Elements as a User: Use heading role
    await expect(page.getByRole('heading', { name: 'Itinerary' })).toBeVisible();

    // 2. State change interaction: click a date and verify the aria-pressed state changes
    const dateButton = page.getByRole('button', { name: /Select date/i }).first();
    await expect(dateButton).toBeVisible();
    await dateButton.click();
    await expect(dateButton).toHaveAttribute('aria-pressed', 'true');

    // 3. Check Highlight dropdown using label
    const dropdown = page.getByRole('combobox', { name: 'Map highlight options' });
    await expect(dropdown).toBeVisible();
    await dropdown.selectOption('states');
  });

  test('should handle network errors gracefully without crashing', async ({ page }) => {
    // Mock a 500 server error on regions endpoint
    await page.route('**/api/regions?type=county', async (route) => {
      await route.fulfill({ status: 500, json: { error: 'Internal Server Error' } });
    });
    
    await page.goto('/');
    
    // Ensure the app still loads the main UI structure despite the background API failure
    await expect(page.getByRole('heading', { name: 'Itinerary' })).toBeVisible();
  });
});
