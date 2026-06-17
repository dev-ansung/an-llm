import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('LLM Chat Application Integration Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to standalone HTML file
    const filePath = path.resolve(process.cwd(), './dist/index.html');
    await page.goto(`file://${filePath}`);
    
    // Clear localStorage to ensure test isolation
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('1. should render welcome screen, sidebar elements, and parameters panel', async ({ page }) => {
    // Welcome text
    await expect(page.locator('text=Select a chat or create a new one to begin.')).toBeVisible();
    await expect(page.locator('button:has-text("New Chat")')).toBeVisible();

    // Sidebar elements
    await expect(page.locator('text=Chats')).toBeVisible();
    await expect(page.getByPlaceholder('Search chats...')).toBeVisible();
    await expect(page.locator('button:has-text("API Settings")')).toBeVisible();

    // Right panel should not be visible when no chat is active
    await expect(page.locator('text=Model Parameters')).not.toBeVisible();
    await page.screenshot({ path: './dist/chat-1-welcome.png', fullPage: true });
  });

  test('2. should handle chat CRUD operations', async ({ page }) => {
    // Create Chat
    await page.locator('button:has-text("New Chat")').click();
    await expect(page.locator('text=New Chat').first()).toBeVisible();

    // Rename Chat via Edit Header Button
    const headerEditBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="EditIcon"]') }).first();
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('Humor Hub');
    });
    await headerEditBtn.click();
    await expect(page.locator('text=Humor Hub').first()).toBeVisible();

    // Delete Chat
    const headerDeleteBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="DeleteIcon"]') }).first();
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    await headerDeleteBtn.click();

    // Verify returning to welcome screen
    await expect(page.locator('text=Select a chat or create a new one to begin.')).toBeVisible();
    await page.screenshot({ path: './dist/chat-2-crud.png', fullPage: true });
  });

  test('3. should configure and persist API settings in localStorage', async ({ page }) => {
    // Open API Settings
    await page.locator('button:has-text("New Chat")').click(); // activate screen to enable layout
    await page.locator('button:has-text("API Settings")').click();
    await expect(page.locator('text=API Configuration')).toBeVisible();

    // Fill new details
    const apiBaseInput = page.getByLabel('API Base URL');
    await apiBaseInput.fill('https://mockapi.openai.com/v1');
    const modelNameInput = page.getByLabel('Model Name');
    await modelNameInput.fill('gpt-4o-mock');

    // Close Dialog
    await page.locator('button:has-text("Close")').click();
    await expect(page.locator('text=API Configuration')).not.toBeVisible();

    // Reload page to verify persistence
    await page.reload();
    await page.locator('button:has-text("API Settings")').click();
    await expect(page.getByLabel('API Base URL')).toHaveValue('https://mockapi.openai.com/v1');
    await expect(page.getByLabel('Model Name')).toHaveValue('gpt-4o-mock');
    await page.screenshot({ path: './dist/chat-3-api-settings.png', fullPage: true });
  });

  test('4. should support mocked streaming completions and render performance metrics', async ({ page }) => {
    // Set up endpoint mock
    await page.route('**/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: [
          'data: {"choices":[{"delta":{"content":"Gemma-4 "}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"is running!"}}]}\n\n',
          'data: [DONE]\n\n'
        ].join('')
      });
    });

    await page.locator('button:has-text("New Chat")').click();
    
    // Send message
    const input = page.getByPlaceholder('Send a message to the model...');
    await input.fill('Status update?');
    await input.press('Enter');

    // Verify streaming text
    await expect(page.locator('text=Gemma-4 is running!')).toBeVisible();

    // Verify statistics (speed, tokens)
    await expect(page.locator('text=tokens')).toBeVisible();
    await expect(page.locator('text=tok/s')).toBeVisible();
    await page.screenshot({ path: './dist/chat-4-streaming.png', fullPage: true });
  });

  test('5. should support inline message editing (Discard vs. Save)', async ({ page }) => {
    // Setup message thread
    await page.route('**/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"choices":[{"delta":{"content":"Reply"}}]}\n\ndata: [DONE]\n\n'
      });
    });

    await page.locator('button:has-text("New Chat")').click();
    const input = page.getByPlaceholder('Send a message to the model...');
    await input.fill('Original Content');
    await input.press('Enter');
    await expect(page.locator('text=Reply')).toBeVisible();

    // Trigger edit mode
    const editBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="EditIcon"]') }).nth(1);
    await editBtn.click();

    // Locate open textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.fill('Draft Content');

    // Discard edit
    await page.locator('button:has-text("Discard (Esc)")').click();
    await expect(page.locator('text=Original Content')).toBeVisible();
    await expect(page.locator('text=Draft Content')).not.toBeVisible();

    // Trigger edit and Save
    await editBtn.click();
    const textarea2 = page.locator('textarea').first();
    await textarea2.fill('Confirmed Content');
    await page.locator('button:has-text("Save (⌘Enter)")').click();

    await expect(page.locator('text=Confirmed Content')).toBeVisible();
    // Verify editing preserved downstream replies
    await expect(page.locator('text=Reply')).toBeVisible();
    await page.screenshot({ path: './dist/chat-5-editing.png', fullPage: true });
  });

  test('6. should support forking conversation into new chats', async ({ page }) => {
    await page.route('**/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"choices":[{"delta":{"content":"Forkable response"}}]}\n\ndata: [DONE]\n\n'
      });
    });

    await page.locator('button:has-text("New Chat")').click();
    const input = page.getByPlaceholder('Send a message to the model...');
    await input.fill('Message to Fork');
    await input.press('Enter');
    await expect(page.locator('text=Forkable response')).toBeVisible();

    // Fork from Assistant Message (second AltRoute button in DOM)
    const forkBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="AltRouteIcon"]') }).nth(1);
    await forkBtn.click();

    // Assert a new active chat exists with title suffix
    await expect(page.locator('text=New Chat (Fork)').first()).toBeVisible();
    await page.screenshot({ path: './dist/chat-6-forking.png', fullPage: true });
  });

  test('7. should support deleting messages instantly from conversation list', async ({ page }) => {
    await page.route('**/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"choices":[{"delta":{"content":"Mock reply"}}]}\n\ndata: [DONE]\n\n'
      });
    });

    await page.locator('button:has-text("New Chat")').click();
    const input = page.getByPlaceholder('Send a message to the model...');
    await input.fill('Deletable message');
    await input.press('Enter');
    await expect(page.locator('text=Mock reply')).toBeVisible();

    // Delete user message (second Delete icon in DOM; first is in header)
    const deleteBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="DeleteIcon"]') }).nth(1);
    await deleteBtn.click();

    // Verify deletion in UI
    await expect(page.locator('text=Deletable message')).not.toBeVisible();
    await page.screenshot({ path: './dist/chat-7-deletion.png', fullPage: true });
  });

  test('8. should toggle settings tabs and parameters', async ({ page }) => {
    await page.locator('button:has-text("New Chat")').click();

    // Tabs
    const logsTab = page.locator('button:has-text("Logs")');
    const paramsTab = page.locator('button:has-text("Parameters")');

    await expect(logsTab).toBeVisible();
    await expect(paramsTab).toBeVisible();

    // Model Parameters should be visible by default
    await expect(page.locator('text=Model Parameters')).toBeVisible();

    // Switch to Logs and verify empty state
    await logsTab.click();
    await expect(page.locator('text=API Call Logs')).toBeVisible();
    await expect(page.locator('text=No API calls recorded yet.')).toBeVisible();

    // Switch back to Parameters
    await paramsTab.click();
    await expect(page.locator('text=Model Parameters')).toBeVisible();

    // Enable Thinking Switch
    const thinkingSwitch = page.locator('input[type="checkbox"]').first(); // first switch is in accordion custom fields
    await expect(thinkingSwitch).not.toBeChecked();
    await thinkingSwitch.click();
    await expect(thinkingSwitch).toBeChecked();
    await page.screenshot({ path: './dist/chat-8-toggles.png', fullPage: true });
  });

  test('9. should support continuing assistant messages', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/v1/chat/completions', async (route) => {
      requestCount++;
      const requestBody = route.request().postDataJSON();
      
      if (requestCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"choices":[{"delta":{"content":"Once upon a time"}}]}\n\ndata: [DONE]\n\n'
        });
      } else {
        const lastMsg = requestBody.messages[requestBody.messages.length - 1];
        expect(lastMsg.role).toBe('assistant');
        expect(lastMsg.content).toBe('Once upon a time');
        
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"choices":[{"delta":{"content":", there was a model."}}]}\n\ndata: [DONE]\n\n'
        });
      }
    });

    await page.locator('button:has-text("New Chat")').click();
    const input = page.getByPlaceholder('Send a message to the model...');
    await input.fill('Write a story opening');
    await input.press('Enter');

    await expect(page.locator('text=Once upon a time')).toBeVisible();

    // Click continue button (ArrowForward)
    const continueBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="ArrowForwardIcon"]') }).first();
    await continueBtn.click();

    // Verify continuation text is appended to the same assistant message
    await expect(page.locator('text=Once upon a time, there was a model.')).toBeVisible();
    await page.screenshot({ path: './dist/chat-9-continuation.png', fullPage: true });
  });

  test('10. should have hover tooltips for all icon buttons', async ({ page }) => {
    await page.locator('button:has-text("New Chat")').click();

    // Verify aria-label tooltip wiring
    const newChatBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="AddIcon"]') }).first();
    await expect(newChatBtn).toHaveAttribute('aria-label', 'New Chat');

    const deleteChatBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="DeleteIcon"]') }).first();
    await expect(deleteChatBtn).toHaveAttribute('aria-label', 'Delete Chat');
    await page.screenshot({ path: './dist/chat-10-tooltips.png', fullPage: true });
  });

  test('11. should share and persist global parameters across chats and sessions', async ({ page }) => {
    // Create Chat A
    await page.locator('button:has-text("New Chat")').click();
    await expect(page.locator('text=New Chat').first()).toBeVisible();

    const paramsTab = page.locator('button:has-text("Parameters")');
    await paramsTab.click();

    // Change System Prompt in Chat A
    const systemPromptInput = page.getByPlaceholder('Enter system prompt...');
    await systemPromptInput.fill('You are a coding wizard.');

    // Create Chat B (using the sidebar add icon button)
    const sidebarNewChatBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="AddIcon"]') }).first();
    await sidebarNewChatBtn.click();

    // Verify Chat B shares the same global parameter
    await expect(page.getByPlaceholder('Enter system prompt...')).toHaveValue('You are a coding wizard.');

    // Reload page (simulating fresh session)
    await page.reload();
    await paramsTab.click();

    // Verify settings persisted
    await expect(page.getByPlaceholder('Enter system prompt...')).toHaveValue('You are a coding wizard.');
    await page.screenshot({ path: './dist/chat-11-global-parameters.png', fullPage: true });
  });

  test('12. should support regenerating assistant messages', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/v1/chat/completions', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"choices":[{"delta":{"content":"Once upon a time"}}]}\n\ndata: [DONE]\n\n'
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"choices":[{"delta":{"content":"There was a brave developer"}}]}\n\ndata: [DONE]\n\n'
        });
      }
    });

    await page.locator('button:has-text("New Chat")').click();
    const input = page.getByPlaceholder('Send a message to the model...');
    await input.fill('Write a story');
    await input.press('Enter');

    await expect(page.locator('text=Once upon a time')).toBeVisible();

    // Click regenerate button (Replay)
    const regenerateBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="ReplayIcon"]') }).first();
    await regenerateBtn.click();

    // Verify it updates to the new response
    await expect(page.locator('text=There was a brave developer')).toBeVisible();
    await expect(page.locator('text=Once upon a time')).not.toBeVisible();
    await page.screenshot({ path: './dist/chat-12-regeneration.png', fullPage: true });
  });

  test('13. should support stopping an ongoing LLM generation call', async ({ page }) => {
    // Set up endpoint mock to stall response forever
    await page.route('**/v1/chat/completions', async () => {
      await new Promise(() => {});
    });

    await page.locator('button:has-text("New Chat")').click();
    const input = page.getByPlaceholder('Send a message to the model...');
    await input.fill('Write something long');
    await input.press('Enter');

    // Verify stop button is visible during loading
    const stopBtn = page.locator('[data-testid="stop-button"]');
    await expect(stopBtn).toBeVisible();

    // Click the stop button to abort
    await stopBtn.click();

    // Verify loading controls are replaced by standard send button
    await expect(stopBtn).not.toBeVisible();
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();

    // Switch to Logs panel and verify log entry is recorded as Aborted
    await page.locator('button:has-text("Logs")').click();
    await expect(page.locator('text=Aborted').first()).toBeVisible();

    await page.screenshot({ path: './dist/chat-13-stop-generation.png', fullPage: true });
  });

  test('14. should maintain identical text wrapping during message edit', async ({ page }) => {
    await page.route('**/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"choices":[{"delta":{"content":"Reply"}}]}\n\ndata: [DONE]\n\n'
      });
    });

    await page.locator('button:has-text("New Chat")').click();
    const input = page.getByPlaceholder('Send a message to the model...');
    const longWord = '1234567890'.repeat(15); // 150 chars long word
    await input.fill(longWord);
    await input.press('Enter');

    // Wait for response
    await expect(page.locator('text=Reply')).toBeVisible();

    // Take screenshot of normal user message bubble
    const userBubble = page.locator('text=' + longWord);
    await expect(userBubble).toBeVisible();
    const normalBox = await userBubble.boundingBox();
    expect(normalBox).not.toBeNull();
    await page.screenshot({ path: './dist/chat-14-wrap-normal.png', fullPage: true });

    // Trigger edit mode
    const editBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="EditIcon"]') }).nth(1);
    await editBtn.click();

    // Verify textarea is open
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
    const editBox = await textarea.boundingBox();
    expect(editBox).not.toBeNull();

    // Take screenshot of edit mode user message bubble
    await page.screenshot({ path: './dist/chat-14-wrap-editing.png', fullPage: true });

    // Verify dimensions are almost identical (allowing a small padding/border tolerance of 15px)
    console.log('--- BOUNDING BOXES ---', 'normal:', normalBox, 'edit:', editBox);
    expect(Math.abs(normalBox!.width - editBox!.width)).toBeLessThan(15);
    expect(Math.abs(normalBox!.height - editBox!.height)).toBeLessThan(15);

    // Click discard
    await page.locator('button:has-text("Discard (Esc)")').click();
  });
  
});
