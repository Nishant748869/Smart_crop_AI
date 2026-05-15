const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--window-size=1280,1024'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    try {
        await page.goto('http://localhost:3000');
        
        // Login Flow
        await page.click('#loginBtn');
        await page.waitForSelector('#phoneInput');
        await page.type('#phoneInput', '9876543210');
        await page.click('#sendOtpBtn');
        
        await page.waitForSelector('#otpInput', { visible: true });
        await new Promise(r => setTimeout(r, 1000));
        await page.type('#otpInput', '1234');
        await page.click('#verifyOtpBtn');
        
        // Wait for dashboard
        await page.waitForSelector('#dashAddFieldBtn', { visible: true, timeout: 10000 });
        console.log("On Dashboard!");
        
        // Take Dashboard screenshot
        await page.screenshot({ path: '/home/chicmic/.gemini/antigravity/brain/7bfabaab-6b9c-431f-a4e8-ae5a6edcf1b1/dashboard_test.png' });
        
        // Click Irrigations to show modal
        await page.evaluate(() => {
            const historyBtns = document.querySelectorAll('.view-history-btn');
            if (historyBtns.length > 0) historyBtns[0].click();
        });
        
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: '/home/chicmic/.gemini/antigravity/brain/7bfabaab-6b9c-431f-a4e8-ae5a6edcf1b1/history_modal_test.png' });
        console.log("Screenshots captured");
        
    } catch (e) {
        console.error("Test Error:", e);
    } finally {
        await browser.close();
    }
})();
