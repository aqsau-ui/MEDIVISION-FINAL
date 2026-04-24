const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
require('chromedriver');

async function withDriver(fn) {
  const opts = new chrome.Options();
  opts.addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1366,768',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
  );
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(opts).build();
  try {
    return await fn(driver);
  } finally {
    try { await driver.quit(); } catch (_) {}
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function normalize(str) { return String(str || '').trim(); }

async function verifyPMDCSelenium(pmdcNumber, doctorName) {
  const reg = normalize(pmdcNumber).toUpperCase();
  const name = normalize(doctorName);
  console.log(`[Selenium] Verifying PMDC: ${reg} for: ${name}`);

  return withDriver(async (driver) => {
    try {
      await driver.get('https://pmdc.pk/');
      await sleep(4000);

      // Find the Registration Number input (id="DocRegNo")
      let inputEl;
      try {
        inputEl = await driver.wait(until.elementLocated(By.id('DocRegNo')), 10000);
      } catch (_) {
        const fallbacks = [
          By.css('input.search_field'),
          By.css("input[placeholder*='Registration Number']"),
          By.css("input[name='DocRegNo']"),
        ];
        for (const sel of fallbacks) {
          try { inputEl = await driver.findElement(sel); if (inputEl) break; } catch (_) {}
        }
      }

      if (!inputEl) {
        return { isValid: false, message: 'PMDC website could not be loaded. Please try again.' };
      }

      // Type PMDC registration number
      await driver.executeScript('arguments[0].scrollIntoView(true);', inputEl);
      await sleep(300);
      await inputEl.clear();
      await inputEl.sendKeys(reg);
      await sleep(300);

      // Click the Search button (class="button primary_button fn-BtnDocRegNo")
      let searchBtn;
      try {
        searchBtn = await driver.findElement(By.css('button.fn-BtnDocRegNo'));
      } catch (_) {
        const fallbacks = [
          By.xpath("//button[contains(@class,'fn-BtnDocRegNo')]"),
          By.css('#doc_reg .primary_button'),
          By.css('#doc_reg button'),
        ];
        for (const sel of fallbacks) {
          try { searchBtn = await driver.findElement(sel); if (searchBtn) break; } catch (_) {}
        }
      }

      if (!searchBtn) {
        return { isValid: false, message: 'PMDC search button not found.' };
      }

      await driver.executeScript('arguments[0].click();', searchBtn);
      await sleep(5000);

      // -------------------------------------------------------
      // Parse the result table:
      // Columns: Registration No. | Full Name | Father Name | Status | Detail
      // -------------------------------------------------------
      let extractedName = '';
      let extractedStatus = '';
      let extractedRegNo = '';

      try {
        // Find the result table
        const table = await driver.findElement(By.css('table'));
        const rows = await table.findElements(By.css('tr'));

        if (rows.length === 0) {
          return { isValid: false, message: 'Invalid PMDC registration number. No doctor found in PMDC database.' };
        }

        // Read header row to find column indices
        let regNoIdx = 0, fullNameIdx = 1, statusIdx = 3;
        try {
          const headerCells = await rows[0].findElements(By.css('th, td'));
          for (let i = 0; i < headerCells.length; i++) {
            const txt = (await headerCells[i].getText()).toLowerCase().trim();
            if (txt.includes('registration') || txt.includes('reg')) regNoIdx = i;
            else if (txt.includes('full name') || (txt.includes('name') && !txt.includes('father'))) fullNameIdx = i;
            else if (txt.includes('status')) statusIdx = i;
          }
        } catch (_) {}

        console.log(`[Selenium] Column indices — RegNo:${regNoIdx}, FullName:${fullNameIdx}, Status:${statusIdx}`);

        // Read data rows (skip header row 0)
        for (let i = 1; i < rows.length; i++) {
          const cells = await rows[i].findElements(By.css('td'));
          if (cells.length < 2) continue;

          const rowRegNo = cells[regNoIdx] ? (await cells[regNoIdx].getText()).trim().toUpperCase() : '';
          const rowName  = cells[fullNameIdx] ? (await cells[fullNameIdx].getText()).trim() : '';
          const rowStatus = cells[statusIdx] ? (await cells[statusIdx].getText()).trim() : '';

          console.log(`[Selenium] Row ${i}: RegNo=${rowRegNo}, Name=${rowName}, Status=${rowStatus}`);

          // Check if this row matches the registration number we searched
          if (rowRegNo === reg || rowRegNo.replace(/\s/g,'') === reg.replace(/\s/g,'')) {
            extractedName = rowName;
            extractedStatus = rowStatus.toLowerCase();
            extractedRegNo = rowRegNo;
            break;
          }

          // If only one result row exists, use it
          if (rows.length === 2) {
            extractedName = rowName;
            extractedStatus = rowStatus.toLowerCase();
            extractedRegNo = rowRegNo;
          }
        }

      } catch (tableErr) {
        console.warn('[Selenium] Table parse error:', tableErr.message);
        // Check for "no record" text on page
        const src = (await driver.getPageSource()).toLowerCase();
        if (src.includes('no record') || src.includes('not found') || src.includes('no result')) {
          return { isValid: false, message: 'Invalid PMDC registration number. No doctor found in PMDC database.' };
        }
        return { isValid: false, message: 'Could not parse PMDC results. Please try again.' };
      }

      console.log(`[Selenium] Final — Name: "${extractedName}", Status: "${extractedStatus}", RegNo: "${extractedRegNo}"`);

      if (!extractedName) {
        return { isValid: false, message: 'Invalid PMDC registration number. No doctor found in PMDC database.' };
      }

      // Check status
      if (extractedStatus && extractedStatus.includes('in-active') || extractedStatus.includes('inactive') || extractedStatus.includes('suspended')) {
        return { isValid: false, doctorName: extractedName, message: `PMDC registration for "${extractedName}" is ${extractedStatus}. Only active registrations are allowed.` };
      }

      // Verify name matches
      if (name && extractedName) {
        const a = extractedName.toLowerCase().replace(/\s+/g, ' ').split(' ');
        const b = name.toLowerCase().replace(/\s+/g, ' ').split(' ');
        const hits = b.filter(p => p.length >= 2 && a.some(x => x.includes(p) || p.includes(x))).length;
        if (hits >= Math.min(2, b.length)) {
          return { isValid: true, doctorName: extractedName, message: `PMDC verified. Welcome, ${extractedName}!` };
        }
        return {
          isValid: false,
          doctorName: extractedName,
          message: `PMDC number ${reg} belongs to "${extractedName}", not "${name}". Please use your real name as registered with PMDC.`
        };
      }

      return { isValid: true, doctorName: extractedName, message: 'PMDC verified successfully.' };

    } catch (e) {
      console.error('[Selenium] Error:', e.message);
      return { isValid: false, message: `PMDC verification error: ${e.message}` };
    }
  });
}

module.exports = { verifyPMDCSelenium };
