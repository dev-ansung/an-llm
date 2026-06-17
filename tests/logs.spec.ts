import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('LLM Chat Application API Call Logs Feature Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    const filePath = path.resolve(process.cwd(), './dist/index.html');
    await page.goto(`file://${filePath}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display Parameters by default and log API requests on success', async ({ page }) => {
    // Mock the completions endpoint
    await page.route('**/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: [
          'data: {"choices":[{"delta":{"content":"Hello! "}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"How can I assist?"}}]}\n\n',
          'data: [DONE]\n\n'
        ].join('')
      });
    });

    // Create a new chat
    await page.locator('button:has-text("New Chat")').click();

    // Verify Parameters is visible by default and Logs can be clicked
    await expect(page.locator('text=Model Parameters')).toBeVisible();
    
    const logsTab = page.locator('button:has-text("Logs")');
    await logsTab.click();
    await expect(page.locator('text=No API calls recorded yet.')).toBeVisible();

    // Fill system prompt to verify it gets logged
    const paramsTab = page.locator('button:has-text("Parameters")');
    await paramsTab.click();
    const systemPromptInput = page.getByPlaceholder('Enter system prompt...');
    await systemPromptInput.fill('You are a helpful debug helper.');

    // Send a message
    const input = page.getByPlaceholder('Send a message to the model...');
    await input.fill('Ping log test');
    await input.press('Enter');

    // Wait for response to stream in
    await expect(page.locator('text=Hello! How can I assist?')).toBeVisible();

    // Go to Logs tab and verify log entry exists
    await logsTab.click();
    await expect(page.locator('text=POST /chat/completions')).toBeVisible();
    await expect(page.locator('text=google/gemma-4-12b-qat').first()).toBeVisible();
    await expect(page.locator('text=Success').first()).toBeVisible();

    // Expand the log accordion
    await page.locator('text=POST /chat/completions').first().click();

    // Verify request URL is displayed
    await expect(page.locator('text=http://127.0.0.1:1234/v1/chat/completions')).toBeVisible();

    // Verify payload and content are displayed
    await expect(page.locator('text=You are a helpful debug helper.').first()).toBeVisible();
    await expect(page.locator('text=Ping log test').first()).toBeVisible();
    await expect(page.locator('text=Hello! How can I assist?').first()).toBeVisible();

    // Take screenshot of logs state
    const screenshotPath = path.resolve(process.cwd(), './dist/logs-1-success.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved logs screenshot to: ${screenshotPath}`);
  });

  test('should log API errors in detail and allow clearing logs', async ({ page }) => {
    // Mock the completions endpoint with an error status
    await page.route('**/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Injected server malfunction test error.' } })
      });
    });

    // Create a new chat
    await page.locator('button:has-text("New Chat")').click();

    // Send a message to trigger the error
    const input = page.getByPlaceholder('Send a message to the model...');
    await input.fill('Trigger error');
    await input.press('Enter');

    // Wait for the UI error rendering
    await expect(page.locator('text=Injected server malfunction test error.').first()).toBeVisible();

    // Go to Logs and verify the error log entry
    const logsTab = page.locator('button:has-text("Logs")');
    await logsTab.click();
    await expect(page.locator('text=POST /chat/completions')).toBeVisible();
    await expect(page.locator('text=Error').first()).toBeVisible();

    // Expand the log and check error payload
    await page.locator('text=POST /chat/completions').click();
    await expect(page.locator('.MuiAccordionDetails-root').locator('text=Injected server malfunction test error.')).toBeVisible();

    // Clear the logs
    const clearBtn = page.locator('button:has-text("Clear Logs")');
    await clearBtn.click();

    // Verify list is empty
    await expect(page.locator('text=No API calls recorded yet.')).toBeVisible();
    await page.screenshot({ path: './dist/logs-2-error-clear.png', fullPage: true });
  });

});
