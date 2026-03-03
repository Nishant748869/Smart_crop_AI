const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--window-size=1280,1024'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    try {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

        // Click Guest Mode
        await page.waitForSelector('#guestModeBtn');
        await page.click('#guestModeBtn');

        // Wait for step-1 location
        await page.waitForSelector('#manualSubmitBtn', { visible: true });
        await page.type('#latInput', '30.9');
        await page.type('#lonInput', '75.8');
        await page.click('#manualSubmitBtn');

        // Wait for step-2 details
        await page.waitForSelector('#saveFieldBtn', { visible: true, timeout: 5000 }).catch(() => { });
        // In guest mode, saveFieldBtn is hidden. We wait for results to populate.
        await page.waitForSelector('#res-rain', { visible: true });

        await new Promise(r => setTimeout(r, 2000));

        // Scroll down to the Guest CTA Banner
        await page.evaluate(() => {
            const banner = document.getElementById('guestCtaBanner');
            if (banner) banner.scrollIntoView({ behavior: 'instant', block: 'center' });
        });

        await new Promise(r => setTimeout(r, 1000));

        // Take a screenshot of the results and pulsing button
        await page.screenshot({ path: '/home/chicmic/.gemini/antigravity/brain/7bfabaab-6b9c-431f-a4e8-ae5a6edcf1b1/guest_cta_pulsing.png' });

        console.log("Screenshot test complete!");
    } catch (e) {
        console.error("Test Crash:", e);
    } finally {
        await browser.close();
    }
})();
