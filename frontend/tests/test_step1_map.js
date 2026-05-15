const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--window-size=1280,1024'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    try {
        await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

        await new Promise(r => setTimeout(r, 1000));
        await page.click('#guestModeBtn');

        // Wait for map container animation and tile loading
        await new Promise(r => setTimeout(r, 2000));

        // Emulate clicks to draw a polygon on the full screen map
        const centerX = 640;
        const centerY = 600; // shifted down slightly because header is at the top

        await page.mouse.click(centerX - 200, centerY - 200);
        await new Promise(r => setTimeout(r, 500));
        await page.mouse.click(centerX + 250, centerY - 150);
        await new Promise(r => setTimeout(r, 500));
        await page.mouse.click(centerX + 200, centerY + 250);
        await new Promise(r => setTimeout(r, 500));
        await page.mouse.click(centerX - 250, centerY + 200);
        await new Promise(r => setTimeout(r, 1000));

        // Take a screenshot of the drawn polygon in Fullscreen Overlay
        await page.screenshot({ path: '/home/chicmic/.gemini/antigravity/brain/7bfabaab-6b9c-431f-a4e8-ae5a6edcf1b1/step1_fullscreen_map.png' });

        console.log("Screenshot test complete!");
    } catch (e) {
        console.error("Test Crash:", e);
    } finally {
        await browser.close();
    }
})();
