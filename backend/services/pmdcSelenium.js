const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
require('chromedriver');

async function withDriver(fn) {
  const opts = new chrome.Options();
  const headless = (process.env.PMDC_SELENIUM_HEADFUL || 'false').toLowerCase() !== 'true';
  if (headless) {
    opts.addArguments(
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=1280,1024'
    );
  }

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(opts).build();
  try {
    return await fn(driver);
  } finally {
    try { await driver.quit(); } catch (_) {}
  }
}

function normalize(str) {
  return String(str || '').trim();
}

async function verifyPMDCSelenium(pmdcNumber, doctorName) {
  const reg = normalize(pmdcNumber).toUpperCase();
  const name = normalize(doctorName);

  return withDriver(async (driver) => {
    try {
      await driver.get('https://pmdc.pk/');

      // Wait for the search widget to render
      // Click the "Registration Number" tab if present
      try {
        const regTab = await driver.wait(
          until.elementLocated(By.xpath("//*[contains(., 'Registration Number') and (self::button or self::a or self::div)]")),
          8000
        );
        await regTab.click();
      } catch (_) { /* continue if not found */ }

      // Find the input near the search panel (try a few selectors)
      let inputEl;
      const candidateXpaths = [
        "//input[contains(@placeholder,'Registration') or contains(@placeholder,'number') or contains(@placeholder,'Search')]",
        "(//input[@type='text'])[1]",
        "//section//*[self::input or self::textarea][1]"
      ];
      for (const xp of candidateXpaths) {
        try {
          inputEl = await driver.findElement(By.xpath(xp));
          if (inputEl) break;
        } catch (_) {}
      }
      if (!inputEl) {
        return { isValid: false, message: 'Unable to locate PMDC search input on the website.' };
      }

      await inputEl.clear();
      await inputEl.sendKeys(reg);

      // Click Search button (try by text)
      let searchBtn;
      const buttonXpaths = [
        "//button[normalize-space()='Search']",
        "//a[normalize-space()='Search']",
        "//input[@type='submit' or @value='Search']",
        "(//button)[1]"
      ];
      for (const bx of buttonXpaths) {
        try {
          searchBtn = await driver.findElement(By.xpath(bx));
          if (searchBtn) break;
        } catch (_) {}
      }
      if (!searchBtn) {
        return { isValid: false, message: 'Unable to locate PMDC search button on the website.' };
      }

      await searchBtn.click();

      // Wait for results (a table or result card)
      let tableEl;
      try {
        tableEl = await driver.wait(
          until.elementLocated(By.xpath("//table | //div[contains(@class,'table') or contains(@class,'result')][1]")),
          12000
        );
      } catch (_) {}

      if (!tableEl) {
        // Check if "No Record" message exists
        try {
          const noRec = await driver.findElement(By.xpath("//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'no record')]"));
          if (noRec) return { isValid: false, message: 'Invalid PMDC registration number. No doctor found.' };
        } catch (_) {}
        return { isValid: false, message: 'Could not find PMDC results on the page.' };
      }

      const html = await tableEl.getAttribute('outerHTML');
      // Lightweight parse using regex heuristics
      const nameMatch = html.match(/>\s*Name\s*<[^>]*>\s*([^<]+)\s*</i) || html.match(/<td[^>]*>\s*([A-Za-z][A-Za-z\s'.-]+)\s*<\/td>/i);
      const statusMatch = html.match(/Status[^<]*<[^>]*>\s*([^<]+)\s*</i);
      const extractedName = nameMatch ? nameMatch[1].trim() : '';
      const status = (statusMatch ? statusMatch[1] : '').toLowerCase();

      // Decide validity
      const isActive = !status || /active|valid|registered/.test(status);
      if (!isActive) {
        return { isValid: false, doctorName: extractedName, message: 'PMDC registration found but status is inactive or suspended.' };
      }

      if (name && extractedName) {
        const a = extractedName.toLowerCase().replace(/\s+/g, ' ').split(' ');
        const b = name.toLowerCase().replace(/\s+/g, ' ').split(' ');
        const hits = b.filter(part => part.length >= 2 && a.some(x => x.includes(part) || part.includes(x))).length;
        if (hits >= Math.min(2, b.length)) {
          return { isValid: true, doctorName: extractedName, message: 'Valid PMDC registration (Selenium).' };
        }
        return { isValid: false, doctorName: extractedName, message: `PMDC shows \"${extractedName}\" which does not match \"${name}\".` };
      }

      return extractedName
        ? { isValid: true, doctorName: extractedName, message: 'Valid PMDC registration (Selenium).' }
        : { isValid: false, message: 'Unable to extract doctor details from PMDC results.' };
    } catch (e) {
      return { isValid: false, message: `Selenium verification failed: ${e.message}` };
    }
  });
}

module.exports = { verifyPMDCSelenium };
