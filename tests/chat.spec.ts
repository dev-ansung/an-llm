import { test, expect } from '@playwright/test';
import * as path from 'path';

test('verify standalone chat app functionality and layout with mocked stream', async ({ page }) => {
  const filePath = path.resolve(process.cwd(), './dist/index.html');
  const fileUrl = `file://${filePath}`;

  // Mock OpenAI Chat Completion SSE Stream
  await page.route('**/v1/chat/completions', async (route) => {
    // Assert request format
    const requestBody = route.request().postDataJSON();
    expect(requestBody).toBeDefined();
    expect(requestBody.messages).toBeDefined();
    expect(requestBody.stream).toBe(true);

    // Fulfill with mocked chunked Server-Sent Events (SSE)
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
      body: [
        'data: {"choices":[{"delta":{"content":"This"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" is"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" a mocked"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" streaming response."}}]}\n\n',
        'data: [DONE]\n\n'
      ].join('')
    });
  });

  // Navigate to application
  await page.goto(fileUrl);

  // 1. Initial State Check
  await expect(page.locator('text=Select a chat or create a new one to begin.')).toBeVisible();

  // 2. Create a New Chat
  const newChatBtn = page.locator('button:has-text("New Chat")');
  await newChatBtn.click();
  
  // Verify chat layout is loaded
  await expect(page.getByPlaceholder('Send a message to the model...')).toBeVisible();
  
  // 3. Send Message and Trigger Streaming
  const textarea = page.getByPlaceholder('Send a message to the model...');
  await textarea.fill('Hello model, please reply');
  
  // Press enter to send
  await textarea.press('Enter');

  // Verify user message appears in UI
  await expect(page.locator('text=Hello model, please reply')).toBeVisible();

  // 4. Verify Stream Output & Metrics
  // The assistant message should contain the full mocked response
  await expect(page.locator('text=This is a mocked streaming response.')).toBeVisible();

  // Verify metrics are calculated and displayed (e.g. "tokens", "tok/s")
  await expect(page.locator('text=tokens')).toBeVisible();
  await expect(page.locator('text=tok/s')).toBeVisible();

  // 5. Test Forking the Conversation
  // Fork from the assistant's message (the second AltRouteIcon button; index 0 is on the user message)
  const assistantForkBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="AltRouteIcon"]') }).nth(1);
  await assistantForkBtn.click();

  // Forked chat should have a title like "New Chat (Fork)"
  await expect(page.locator('text=New Chat (Fork)').first()).toBeVisible();

  // 6. Test Editing a Message (on the forked chat)
  // Edit the user message (the second EditIcon button; index 0 is in the header of the new chat)
  const userEditBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="EditIcon"]') }).nth(1);
  await userEditBtn.click();

  // Find the open textarea in edit mode and type new content
  const editField = page.locator('textarea').first();
  await editField.fill('Hello model, this is an edited message');

  // Click Save (⌘Enter) button
  const saveBtn = page.locator('button:has-text("Save (⌘Enter)")');
  await saveBtn.click();
  
  // Verify edited message text is updated in UI
  await expect(page.locator('text=Hello model, this is an edited message')).toBeVisible();

  // 7. Test Deleting a Message
  // Delete the edited user message (the second DeleteIcon button in the DOM; index 0 is in the header)
  const userDeleteBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="DeleteIcon"]') }).nth(1);
  
  await userDeleteBtn.click();
  
  // Verify that the user message is gone from the UI
  await expect(page.locator('text=Hello model, this is an edited message')).not.toBeVisible();

  // 8. Take Screenshot of Success State
  const screenshotPath = path.resolve(process.cwd(), './dist/playwright-screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Successfully completed all tests. Screenshot saved to: ${screenshotPath}`);
});
