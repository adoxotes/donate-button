import { test, expect, chromium } from "@playwright/test";
import { createPublicClient, http, parseAbi } from "viem";
import { anvil } from "viem/chains";

/**
 * Integration test for the TipButton component using Playwright and MetaMask.
 *
 * @remark
 * This test requires a manual browser instance running with MetaMask installed
 * and configured to the Anvil network. Start the browser with:
 * chromium-browser (or whatever) --remote-debugging-port=9222
 */
test.describe("TipButton USDC Transaction (Existing Browser)", () => {
  test("User can tip 1 USDC successfully", async () => {
    // Connect to a running browser instance via Chrome DevTools Protocol (CDP).
    // This allows the test to interact with an already-authenticated MetaMask wallet.
    const browser = await chromium.connectOverCDP("http://localhost:9222");

    // Retrieve the active browser context and page.
    const context = browser.contexts()[0];
    const page = context.pages()[0] || (await context.newPage());

    // Vite dev server is running app on this address
    await page.goto("http://localhost:5173");

    // Locate the Tip Button
    const tipButton = page.locator(".tip-button");

    // ERC20 Approval
    const [approvalPopup] = await Promise.all([
      context.waitForEvent("page"),
      tipButton.click(),
    ]);

    // Focus the MetaMask popup and confirm the USDC 'Approve' request.
    await approvalPopup.bringToFront();
    await approvalPopup.getByTestId("confirm-footer-button").click();

    // Contract Funding
    // After approval, the application automatically triggers the 'fund' transaction.
    const confirmPopup = await context.waitForEvent("page");
    await confirmPopup.bringToFront();
    await confirmPopup.getByTestId("confirm-footer-button").click();

    // Verification 1: UI Feedback
    // The coin animation should transition to the 'coin-landed' state upon success.
    await expect(tipButton).toHaveClass(/coin-landed/, { timeout: 15000 });

    // Verification 2: On-chain State
    // We use viem to directly query the blockchain and verify the fund transfer.
    const FUND_ME_ADDRESS = "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9";
    const USDC_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

    const publicClient = createPublicClient({
      chain: anvil,
      transport: http(),
    });

    const minAbi = parseAbi([
      "function balanceOf(address owner) view returns (uint256)",
    ]);

    // Check if the destination contract's USDC balance has increased.
    // 1 USDC = 1,000,000 units (6 decimals).
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: minAbi,
      functionName: "balanceOf",
      args: [FUND_ME_ADDRESS],
    });

    expect(balance).toBeGreaterThanOrEqual(1000000n);

    await browser.close();
  });
});
