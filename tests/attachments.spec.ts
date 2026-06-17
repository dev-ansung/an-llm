import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('LLM Chat Attachments Integration Suite', () => {
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  test.beforeEach(async ({ page }) => {
    // Navigate to standalone HTML file
    const filePath = path.resolve(process.cwd(), './dist/index.html');
    await page.goto(`file://${filePath}`);
    
    // Clear localStorage to ensure test isolation
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('1. should show popover options, stage text and image files, and allow deletion', async ({ page }) => {
    // Create new chat to show input box
    await page.locator('button:has-text("New Chat")').click();

    // Trigger file chooser for text file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-testid="attach-button"]').click();
    await page.locator('[data-testid="attach-file-option"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Meeting notes content.')
    });

    // Trigger file chooser for image file
    const imageChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-testid="attach-button"]').click();
    await page.locator('[data-testid="attach-image-option"]').click();
    const imageChooser = await imageChooserPromise;
    await imageChooser.setFiles({
      name: 'screenshot.png',
      mimeType: 'image/png',
      buffer: Buffer.from(base64Png, 'base64')
    });

    // Assert both are staged
    await expect(page.locator('[data-testid="staged-attachments-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="staged-file"]')).toContainText('notes.txt');
    await expect(page.locator('[data-testid="staged-image"]')).toBeVisible();

    // Remove the text file attachment
    await page.locator('[data-testid="staged-attachment"]').filter({ hasText: 'notes.txt' }).locator('[data-testid="remove-attachment"]').click();

    // Assert only image remains staged
    await expect(page.locator('[data-testid="staged-file"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="staged-image"]')).toBeVisible();

    await page.screenshot({ path: './dist/attachments-1-previews.png', fullPage: true });
  });

  test('2. should send message with image, format multimodal payload, and render preview thumbnail in bubbles', async ({ page }) => {
    let capturedPayload: any = null;

    // Set up endpoint mock
    await page.route('**/v1/chat/completions', async (route) => {
      capturedPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: [
          'data: {"choices":[{"delta":{"content":"Analyzing the image..."}}]}\n\n',
          'data: [DONE]\n\n'
        ].join('')
      });
    });

    // Create new chat
    await page.locator('button:has-text("New Chat")').click();

    // Stage image
    const imageChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-testid="attach-button"]').click();
    await page.locator('[data-testid="attach-image-option"]').click();
    const imageChooser = await imageChooserPromise;
    await imageChooser.setFiles({
      name: 'vision.png',
      mimeType: 'image/png',
      buffer: Buffer.from(base64Png, 'base64')
    });

    // Fill input content
    const input = page.getByPlaceholder('Send a message to the model...');
    await input.fill('What is this image?');

    // Click send
    await page.locator('[data-testid="send-button"]').click();

    // Verify assistant streaming reply
    await expect(page.locator('text=Analyzing the image...')).toBeVisible();

    // Verify image thumbnail is rendered in the user message bubble
    await expect(page.locator('[data-testid="chat-message-images"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-image-thumbnail"]')).toBeVisible();

    // Verify correct multimodal vision API payload
    expect(capturedPayload).not.toBeNull();
    const messages = capturedPayload.messages;
    const userMessage = messages.find((m: any) => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(Array.isArray(userMessage.content)).toBe(true);
    expect(userMessage.content[0]).toEqual({ type: 'text', text: 'What is this image?' });
    expect(userMessage.content[1].type).toBe('image_url');
    expect(userMessage.content[1].image_url.url).toContain('data:image/png;base64,');

    await page.screenshot({ path: './dist/attachments-2-vision.png', fullPage: true });
  });

  test('3. should send message with text file, append inside code blocks, and render file badge in bubbles', async ({ page }) => {
    let capturedPayload: any = null;

    // Set up endpoint mock
    await page.route('**/v1/chat/completions', async (route) => {
      capturedPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: [
          'data: {"choices":[{"delta":{"content":"Got the document!"}}]}\n\n',
          'data: [DONE]\n\n'
        ].join('')
      });
    });

    // Create new chat
    await page.locator('button:has-text("New Chat")').click();

    // Stage text file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-testid="attach-button"]').click();
    await page.locator('[data-testid="attach-file-option"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'doc.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Some special text content.')
    });

    // Fill input content
    const input = page.getByPlaceholder('Send a message to the model...');
    await input.fill('Please summarize.');

    // Click send
    await page.locator('[data-testid="send-button"]').click();

    // Verify assistant streaming reply
    await expect(page.locator('text=Got the document!')).toBeVisible();

    // Verify text file badge is rendered in the user message bubble
    await expect(page.locator('[data-testid="chat-message-files"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-file-badge"]')).toContainText('doc.txt');

    // Verify correct text-only prepended content API payload
    expect(capturedPayload).not.toBeNull();
    const messages = capturedPayload.messages;
    const userMessage = messages.find((m: any) => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(typeof userMessage.content).toBe('string');
    expect(userMessage.content).toContain('[Attached File: doc.txt]');
    expect(userMessage.content).toContain('Some special text content.');
    expect(userMessage.content).toContain('Please summarize.');

    await page.screenshot({ path: './dist/attachments-3-files.png', fullPage: true });
  });
});
