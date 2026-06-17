import { test, expect } from '@playwright/test';
import * as path from 'path';

test('verify standalone chat app functionality and layout', async ({ page }) => {
  // Load local file
  const filePath = path.resolve(process.cwd(), './dist/index.html');
  const fileUrl = `file://${filePath}`;
  
  await page.goto(fileUrl);
  
  // Verify initial welcome screen
  await expect(page.locator('text=Select a chat or create a new one to begin.')).toBeVisible();
  
  // Click New Chat
  const newChatBtn = page.locator('button:has-text("New Chat")');
  await newChatBtn.click();
  
  // Verify active chat view is loaded
  await expect(page.getByPlaceholder('Send a message to the model...')).toBeVisible();
  
  // Verify Tabs on the settings panel
  const toolsTab = page.locator('button:has-text("Tools")');
  const paramsTab = page.locator('button:has-text("Parameters")');
  
  await expect(toolsTab).toBeVisible();
  await expect(paramsTab).toBeVisible();
  
  // Toggle between tabs
  await toolsTab.click();
  await expect(page.locator('text=No tools enabled for Gemma-4.')).toBeVisible();
  
  await paramsTab.click();
  await expect(page.locator('text=Model Parameters')).toBeVisible();
  
  // Open API Settings
  const apiSettingsBtn = page.locator('button:has-text("API Settings")');
  await apiSettingsBtn.click();
  await expect(page.locator('text=API Configuration')).toBeVisible();
  
  // Close API Dialog by clicking outside or close button
  await page.locator('button:has-text("Close")').click();
  await expect(page.locator('text=API Configuration')).not.toBeVisible();
  
  // Take screenshot of UI
  const screenshotPath = path.resolve(process.cwd(), './dist/playwright-screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to: ${screenshotPath}`);
});
