const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--window-size=1280,1024'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    try {
        // Changed to domcontentloaded to avoid infinitely waiting on map tiles
        await page.goto('http://localhost:3000/farm_boundary_map.html', { waitUntil: 'domcontentloaded' });

        // Wait 4 seconds for satellite tiles to load visually
        await new Promise(r => setTimeout(r, 4000));

        // Emulate clicks to draw a polygon on the map
        const centerX = 640;
        const centerY = 500;

        await page.mouse.click(centerX - 100, centerY - 100);
        await new Promise(r => setTimeout(r, 500));
        await page.mouse.click(centerX + 150, centerY - 50);
        await new Promise(r => setTimeout(r, 500));
        await page.mouse.click(centerX + 100, centerY + 150);
        await new Promise(r => setTimeout(r, 500));
        await page.mouse.click(centerX - 150, centerY + 100);
        await new Promise(r => setTimeout(r, 1000));

        // Take a screenshot of the drawn polygon and Area Acres UI
        await page.screenshot({ path: '/home/chicmic/.gemini/antigravity/brain/7bfabaab-6b9c-431f-a4e8-ae5a6edcf1b1/farm_boundary_drawn.png' });

        console.log("Screenshot test complete!");
    } catch (e) {
        console.error("Test Crash:", e);
    } finally {
        await browser.close();
    }
})();
