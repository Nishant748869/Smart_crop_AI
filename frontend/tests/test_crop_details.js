const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--window-size=1280,1024'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    try {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('#loginBtn', { timeout: 5000 });
        
        // Go as guest to see Step 1 & 2 directly
        await page.click('#guestModeBtn');
        await page.waitForSelector('#getLocationBtn', { visible: true });
        
        // Fake location to skip Step 1
        await page.evaluate(() => {
            globalLat = 30.9;
            globalLon = 75.8;
            moveToStep2();
        });
        
        await page.waitForSelector('#cropSelect', { visible: true, timeout: 5000 });
        await new Promise(r => setTimeout(r, 1000));
        
        // Screenshot Step 2 Layout
        await page.screenshot({ path: '/home/chicmic/.gemini/antigravity/brain/7bfabaab-6b9c-431f-a4e8-ae5a6edcf1b1/crop_details_amount_input.png' });
        
        console.log("Screenshot test complete!");
    } catch(e) {
        console.error("Test Crash:", e);
    } finally {
        await browser.close();
    }
})();
