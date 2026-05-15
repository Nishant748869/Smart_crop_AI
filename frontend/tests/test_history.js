const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--window-size=1280,1024'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

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
        await new Promise(r => setTimeout(r, 1500));
        
        // Open History Modal by clicking the big action button:
        await page.evaluate(() => {
            const historyBtns = Array.from(document.querySelectorAll('.view-history-btn'));
            const mainBtn = historyBtns.find(b => b.classList.contains('btn-primary'));
            if (mainBtn) mainBtn.click();
            else if (historyBtns.length > 0) historyBtns[0].click();
        });
        
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: '/home/chicmic/.gemini/antigravity/brain/7bfabaab-6b9c-431f-a4e8-ae5a6edcf1b1/history_modal_polishing.png' });
        
        console.log("Screenshot test complete!");
    } catch(e) {
        console.error("Test Crash:", e);
    } finally {
        await browser.close();
    }
})();
