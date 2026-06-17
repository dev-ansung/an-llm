import { expect, TestInfo } from '@playwright/test';

export async function isLeftSidebarOpen(page: any): Promise<boolean> {
  const sidebar = page.locator('[data-testid="sidebar-container"]');
  if (await sidebar.count() === 0) return false;
  const box = await sidebar.boundingBox();
  if (!box) return false;
  return box.x >= 0;
}

export async function isRightSidebarOpen(page: any): Promise<boolean> {
  const settings = page.locator('[data-testid="settings-panel-container"]');
  if (await settings.count() === 0) return false;
  const box = await settings.boundingBox();
  if (!box) return false;
  const viewportWidth = page.viewportSize() ? page.viewportSize()!.width : 1280;
  return box.x < viewportWidth;
}

export async function ensureDrawersClosed(page: any) {
  const isMobile = page.viewportSize() ? page.viewportSize()!.width < 900 : false;
  if (isMobile) {
    if (await isLeftSidebarOpen(page)) {
      await page.mouse.click(380, 10);
      await expect.poll(async () => !(await isLeftSidebarOpen(page))).toBe(true);
    }
    if (await isRightSidebarOpen(page)) {
      await page.mouse.click(10, 10);
      await expect.poll(async () => !(await isRightSidebarOpen(page))).toBe(true);
    }
  }
}

export async function ensureLeftSidebarOpen(page: any) {
  const isMobile = page.viewportSize() ? page.viewportSize()!.width < 900 : false;
  if (isMobile) {
    if (!(await isLeftSidebarOpen(page))) {
      await ensureDrawersClosed(page);
      await page.locator('[data-testid="mobile-menu-button"]').click();
      await expect.poll(async () => await isLeftSidebarOpen(page)).toBe(true);
    }
  }
}

export async function ensureRightSidebarOpen(page: any) {
  const isMobile = page.viewportSize() ? page.viewportSize()!.width < 900 : false;
  if (isMobile) {
    if (!(await isRightSidebarOpen(page))) {
      await ensureDrawersClosed(page);
      await page.locator('[data-testid="mobile-settings-button"]').click();
      await expect.poll(async () => await isRightSidebarOpen(page)).toBe(true);
    }
  }
}

export function getScreenshotPath(testInfo: TestInfo, baseName: string): string {
  const suffix = testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop';
  return `./dist/${baseName}-${suffix}.png`;
}
