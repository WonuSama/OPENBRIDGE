import { chromium, devices } from "playwright";
import path from "node:path";

const appUrl = "http://127.0.0.1:3000";
const outputDir = path.resolve("public", "github");

async function capture() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["Desktop Chrome"],
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();

  await page.goto(appUrl, { waitUntil: "networkidle" });
  const multiagentsButton = page.getByRole("button", { name: "Multiagentes" });
  if (await multiagentsButton.isVisible()) {
    await multiagentsButton.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outputDir, "openbridge-multiagents.png"), fullPage: true });
  }

  await browser.close();
}

capture().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
