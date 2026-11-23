import { test, expect, Page } from '@playwright/test';

/**
 * Asserts that the document or body does not horizontally scroll/overflow the viewport.
 */
async function assertNoHorizontalOverflow(page: Page) {
    const overflowInfo = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const docScrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const windowWidth = window.innerWidth;

        const hasDocOverflow = docScrollWidth > docWidth + 1;
        const hasBodyOverflow = bodyScrollWidth > windowWidth + 1;

        return {
            hasOverflow: hasDocOverflow || hasBodyOverflow,
            docWidth,
            docScrollWidth,
            bodyScrollWidth,
            windowWidth,
        };
    });

    expect(
        overflowInfo.hasOverflow,
        `Detected horizontal overflow on mobile viewport: docWidth=${overflowInfo.docWidth}, docScrollWidth=${overflowInfo.docScrollWidth}, bodyScrollWidth=${overflowInfo.bodyScrollWidth}`
    ).toBe(false);
}

/**
 * Asserts that no visible, enabled interactive buttons collide/overlap on the viewport.
 */
async function assertNoOverlappingButtons(page: Page) {
    const overlaps = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button:not([disabled])')).filter((btn) => {
            const rect = btn.getBoundingClientRect();
            const style = window.getComputedStyle(btn);
            if (
                rect.width <= 0 ||
                rect.height <= 0 ||
                style.visibility === 'hidden' ||
                style.display === 'none' ||
                style.opacity === '0' ||
                style.pointerEvents === 'none'
            ) {
                return false;
            }

            // Verify the button is not occluded by a backdrop or modal dialog
            const midX = rect.left + rect.width / 2;
            const midY = rect.top + rect.height / 2;
            if (midX < 0 || midY < 0 || midX > window.innerWidth || midY > window.innerHeight) {
                return false;
            }
            const topEl = document.elementFromPoint(midX, midY);
            if (topEl && !btn.contains(topEl) && !topEl.contains(btn)) {
                return false; // occluded by backdrop/dialog
            }

            return true;
        });

        const issues: string[] = [];
        for (let i = 0; i < buttons.length; i++) {
            for (let j = i + 1; j < buttons.length; j++) {
                const b1 = buttons[i];
                const b2 = buttons[j];
                // Ignore nested buttons or parents
                if (b1.contains(b2) || b2.contains(b1)) continue;

                const r1 = b1.getBoundingClientRect();
                const r2 = b2.getBoundingClientRect();

                // Compute bounding box intersection
                const intersectX = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
                const intersectY = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));

                // If intersection exceeds a 4px margin of error (e.g. subpixel border overlap), report overlap
                if (intersectX > 4 && intersectY > 4) {
                    const text1 = b1.textContent?.trim().slice(0, 25) || b1.getAttribute('aria-label') || 'Button 1';
                    const text2 = b2.textContent?.trim().slice(0, 25) || b2.getAttribute('aria-label') || 'Button 2';
                    issues.push(`"${text1}" overlaps with "${text2}" by (${Math.round(intersectX)}px, ${Math.round(intersectY)}px)`);
                }
            }
        }
        return issues;
    });

    expect(overlaps, `Found overlapping buttons on screen:\n${overlaps.join('\n')}`).toEqual([]);
}

test.describe('DineOS E2E Test Suite', () => {
    let consoleErrors: string[] = [];
    let network500Errors: string[] = [];

    test.beforeEach(async ({ page }) => {
        consoleErrors = [];
        network500Errors = [];

        // Track browser console errors
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                const text = msg.text();
                // Filter out harmless local dev server informational logs
                if (
                    !text.includes('React DevTools') &&
                    !text.includes('Download the React DevTools') &&
                    !text.includes('favicon.ico')
                ) {
                    consoleErrors.push(text);
                }
            }
        });

        // Track uncaught page exceptions
        page.on('pageerror', (err) => {
            consoleErrors.push(err.message);
        });

        // Track 500+ HTTP response errors
        page.on('response', (res) => {
            if (res.status() >= 500) {
                network500Errors.push(`${res.status()} ${res.url()}`);
            }
        });
    });

    test.afterEach(async () => {
        // Enforce zero uncaught console errors and zero 500 network responses
        expect(consoleErrors, `Uncaught console errors occurred:\n${consoleErrors.join('\n')}`).toEqual([]);
        expect(network500Errors, `500 network errors occurred:\n${network500Errors.join('\n')}`).toEqual([]);
    });

    /**
     * Test 1: Guest Mobile Menu & Shared Cart Flow
     * Targets Mobile Chrome & Mobile Safari viewports.
     * Asserts no horizontal overflow and no overlapping buttons across all drawers and modals.
     */
    test('Guest Mobile Menu & Shared Cart Flow (Adding items, Drawer, and Split Billing UI)', async ({ page }) => {
        const guestName = 'Priya Patel';

        // 1. Navigate to Guest Table URL
        await page.goto('/r/garnish-annex/t/T1');

        // Clear local storage and reload to ensure fresh guest join modal test
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        // 2. Table Join Modal Check
        const guestNameInput = page.locator('#guestName');
        await expect(guestNameInput).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Welcome to Garnish Annex')).toBeVisible();

        // Layout check on Join Modal
        await assertNoHorizontalOverflow(page);
        await assertNoOverlappingButtons(page);

        // Fill guest name and submit
        await guestNameInput.fill(guestName);
        const joinButton = page.getByRole('button', { name: /Join Table & Browse Menu/i });
        await joinButton.click();

        // 3. Verify Menu Explorer Loaded
        await expect(guestNameInput).toBeHidden({ timeout: 10000 });
        await expect(page.getByPlaceholder('Search appetizing dishes, drinks...')).toBeVisible();

        // Layout check on Menu Explorer
        await assertNoHorizontalOverflow(page);
        await assertNoOverlappingButtons(page);

        // 4. Add First Dish to Shared Cart via Detail Drawer
        // Find the first dish card ADD button
        const firstAddBtn = page.getByRole('button', { name: /ADD/i }).first();
        await expect(firstAddBtn).toBeVisible();
        await firstAddBtn.click();

        // Dish Detail Drawer opens
        const addToCartBtn = page.getByRole('button', { name: /Add to Table Cart/i });
        await expect(addToCartBtn).toBeVisible({ timeout: 5000 });

        // Layout check inside Dish Detail Drawer
        await assertNoHorizontalOverflow(page);
        await assertNoOverlappingButtons(page);

        // Click Add to Table Cart
        await addToCartBtn.click();
        await expect(addToCartBtn).toBeHidden({ timeout: 5000 });

        // 5. Open and Inspect Shared Cart Drawer
        const viewCartBar = page.getByRole('complementary', { name: /Shared Table Cart/i });
        await expect(viewCartBar).toBeVisible({ timeout: 5000 });
        const viewCartBtn = viewCartBar.getByText(/View Cart/i);
        await viewCartBtn.click();

        // Verify Shared Cart Drawer is open
        await expect(page.getByRole('heading', { name: 'Shared Table Cart' })).toBeVisible();
        await expect(page.getByText('Synced live with all diners')).toBeVisible();

        // Layout check inside Shared Cart Drawer
        await assertNoHorizontalOverflow(page);
        await assertNoOverlappingButtons(page);

        // 6. Place Table Order (Send to Kitchen)
        const placeOrderBtn = page.getByRole('button', { name: /Place Table Order/i });
        await expect(placeOrderBtn).toBeVisible();
        await placeOrderBtn.click();

        // 7. Live Order Tracker opens
        await expect(page.getByRole('heading', { name: 'Live Status Tracker' })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Order Sent')).toBeVisible();

        // Layout check in Live Order Tracker
        await assertNoHorizontalOverflow(page);
        await assertNoOverlappingButtons(page);

        // 8. Open Checkout & Split Billing Drawer
        const payBillBtn = page.getByRole('button', { name: /Pay Bill/i });
        await expect(payBillBtn).toBeVisible();
        await payBillBtn.click();

        // Verify Bill Checkout Drawer
        await expect(page.getByRole('heading', { name: 'Checkout & Bill' })).toBeVisible();
        await expect(page.getByText('Choose How to Pay')).toBeVisible();

        // Layout check on Full Bill tab
        await assertNoHorizontalOverflow(page);
        await assertNoOverlappingButtons(page);

        // Test Split Equally Tab
        const splitEquallyTab = page.getByRole('button', { name: 'Split Equally' });
        await splitEquallyTab.click();
        await expect(page.getByText('Split by Diners')).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await assertNoOverlappingButtons(page);

        // Test incrementing and decrementing diners split count
        const plusDinerBtn = page.locator('button:has(svg.lucide-plus)').last();
        if (await plusDinerBtn.isVisible()) {
            await plusDinerBtn.click();
            await page.waitForTimeout(300);
            await assertNoHorizontalOverflow(page);
            await assertNoOverlappingButtons(page);
        }

        // Test By Person (Itemized) Tab
        const byPersonTab = page.getByRole('button', { name: 'By Person' });
        await byPersonTab.click();
        await expect(page.getByText('Select Diner to Settle:')).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await assertNoOverlappingButtons(page);

        // Close Bill Drawer
        const closeBillBtn = page.locator('button:has(svg.lucide-x)').first();
        await closeBillBtn.click();
        await expect(page.getByRole('heading', { name: 'Checkout & Bill' })).toBeHidden();
    });

    /**
     * Test 2: Staff PIN Gate, Floor Map, and Live KDS Tracker
     * Runs on Desktop Chrome.
     */
    test('Staff Operations: PIN Gate, Floor Map, and Live KDS Tracker (Desktop Chrome)', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Staff operations dashboard tested on Desktop Chrome');

        // 1. Navigate to Floor Map (/staff/garnish-annex/floor)
        await page.goto('/staff/garnish-annex/floor');

        // 2. Staff PIN Gate Verification
        const pinGateHeader = page.getByText(/Floor Waiter Map/i);
        await expect(pinGateHeader).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('heading', { name: 'Staff PIN Access' })).toBeVisible();

        // Test Invalid PIN: click digits 9, 9, 9, 9
        const digit9Btn = page.getByRole('button', { name: '9', exact: true });
        for (let i = 0; i < 4; i++) {
            await digit9Btn.click();
            await page.waitForTimeout(100);
        }

        // Verify invalid PIN error displayed
        await expect(page.locator('.animate-shake').or(page.getByText(/Invalid PIN/i))).toBeVisible({ timeout: 5000 });

        // Enter Valid Waiter PIN (2222) via quick demo preset
        const waiterPresetBtn = page.getByRole('button', { name: /waiter/i });
        await waiterPresetBtn.click();

        // 3. Verify Live Floor Map Dashboard Loaded
        await expect(page.getByText('Live Floor Map')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Floor Captain')).toBeVisible();

        // Layout check on Floor Map
        await assertNoHorizontalOverflow(page);
        await assertNoOverlappingButtons(page);

        // 4. Click Table T1 in Floor Map to open Table Detail Drawer
        const floorMapSection = page.locator('section:has-text("Live Floor Map")');
        const table1Tile = floorMapSection.locator('div.cursor-pointer', { hasText: 'T1' }).first();
        await expect(table1Tile).toBeVisible();
        await table1Tile.click();

        // Verify Table Detail Drawer is open
        await expect(page.getByRole('heading', { name: 'Table 1' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/Capacity:/i)).toBeVisible();

        // Close Table Detail Drawer
        const closeDrawerBtn = page.locator('button:has(svg.lucide-x)').first();
        await closeDrawerBtn.click();
        await expect(page.getByRole('heading', { name: 'Table 1' })).toBeHidden();

        // 5. Navigate to Kitchen Display System (KDS)
        await page.goto('/staff/garnish-annex/kds');

        // If KDS PIN Gate is presented, unlock with Head Chef PIN (3333)
        const kitchenPinGate = page.getByText(/Kitchen Display System/i);
        if (await kitchenPinGate.isVisible()) {
            const kitchenPresetBtn = page.getByRole('button', { name: /kitchen|chef/i });
            if (await kitchenPresetBtn.isVisible()) {
                await kitchenPresetBtn.click();
            }
        }

        // 6. Verify KDS Board Loaded
        await expect(page.getByText(/Active Tickets/i)).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: /All Stations/i })).toBeVisible();

        // Test Station Filter Tabs
        const allStationsBtn = page.getByRole('button', { name: /All Stations/i });
        await allStationsBtn.click();

        // Layout check on KDS Board
        await assertNoHorizontalOverflow(page);
        await assertNoOverlappingButtons(page);
    });
});
