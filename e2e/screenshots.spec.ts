import { test } from './fixtures';

// Visual review artifacts (not assertions): written to test-results/.
test('capture settings panel and popup', async ({ context, extensionId }, testInfo) => {
  const panel = await context.newPage();
  await panel.setViewportSize({ width: 420, height: 900 });
  await panel.goto(`chrome-extension://${extensionId}/ui/sidepanel/index.html`);
  await panel.getByRole('button', { name: 'Settings' }).click();
  await panel.getByRole('heading', { name: 'Notifications' }).waitFor();
  await panel.waitForTimeout(400);
  await panel.screenshot({ path: testInfo.outputPath('settings.png') });

  const popup = await context.newPage();
  await popup.setViewportSize({ width: 340, height: 560 });
  await popup.goto(`chrome-extension://${extensionId}/ui/popup/index.html`);
  await popup.waitForTimeout(400);
  await popup.screenshot({ path: testInfo.outputPath('popup.png') });
});
