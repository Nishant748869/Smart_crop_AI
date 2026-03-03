const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--window-size=1280,1024'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    try {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('#loginBtn', { timeout: 5000 });
        
        await page.click('#loginBtn');
        await page.waitForSelector('#phoneInput');
        await page.type('#phoneInput', '9876543210');
        await page.click('#sendOtpBtn');
        
        await page.waitForSelector('#otpInput', { visible: true });
        await new Promise(r => setTimeout(r, 1000));
        await page.type('#otpInput', '1234');
        await page.click('#verifyOtpBtn');
        
        await page.waitForSelector('#dashAddFieldBtn', { visible: true, timeout: 5000 });
        
        const hasAdvisory = await page.$('.fetch-advisory-btn');
        if (!hasAdvisory) {
            console.log("Adding dummy field...");
            await page.click('#dashAddFieldBtn');
            await page.waitForSelector('#manualSubmitBtn', {visible:true});
            await page.type('#latInput', '30.9');
            await page.type('#lonInput', '75.8');
            await page.click('#manualSubmitBtn');
            await page.waitForSelector('#getRecommendationBtn', {visible:true});
            await page.click('#getRecommendationBtn');
            await page.waitForSelector('#saveFieldBtn', {visible:true, timeout:10000});
            await page.click('#saveFieldBtn'); 
            await new Promise(r => setTimeout(r, 2000));
        }

        await page.waitForSelector('.fetch-advisory-btn', { visible: true, timeout: 5000 });
        
        console.log("Clicking advisory btn...");
        await page.evaluate(() => {
            document.querySelector('.fetch-advisory-btn').click();
        });
        
        await new Promise(r => setTimeout(r, 4000));
        await page.screenshot({ path: '/home/chicmic/.gemini/antigravity/brain/7bfabaab-6b9c-431f-a4e8-ae5a6edcf1b1/advisory_results_test.png' });
        console.log("Screenshot test complete!");
    } catch(e) {
        console.error("Test Crash:", e);
    } finally {
        await browser.close();
    }
})();
