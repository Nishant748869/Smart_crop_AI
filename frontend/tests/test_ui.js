const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

    try {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('#guestModeBtn');
        console.log("Found Welcome Screen. Clicking Guest...");
        await page.click('#guestModeBtn');

        await page.waitForSelector('#getLocationBtn');
        console.log("Found Location Screen. Clicking manual trigger...");
        await page.type('#latInput', '30.9');
        await page.type('#lonInput', '75.8');
        await page.click('#manualSubmitBtn');

        await page.waitForSelector('#getRecommendationBtn');
        console.log("Found Details Screen. Fetching recommendations...");
        await page.click('#getRecommendationBtn');

        await page.waitForSelector('#res-location', { timeout: 10000 });
        console.log("Found Results Screen!");

        console.log("Clicking 'Check Another Location' resetting...");
        await page.click('#resetBtn');

        console.log("Puppeteer test completed successfully.");
    } catch (e) {
        console.error("Puppeteer Script Failure:", e);
    } finally {
        await browser.close();
    }
})();
