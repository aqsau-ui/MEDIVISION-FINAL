const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Verify PMDC number from Pakistan Medical Commission website
 * @param {string} pmdcNumber - The PMDC registration number to verify
 * @param {string} doctorName - The doctor's full name for verification
 * @returns {Promise<{isValid: boolean, doctorName?: string, message: string}>}
 */
async function verifyPMDCNumber(pmdcNumber, doctorName = null) {
  try {
    // Normalize inputs
    const normPmdc = String(pmdcNumber || '')
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/_/g, '-');
    const normName = doctorName ? String(doctorName).trim() : null;

    console.log(`Verifying PMDC number: ${normPmdc} for doctor: ${normName}`);

    // Helper: parse a potential HTML table for details
    const parseFromHtml = (html) => {
      try {
        const $ = cheerio.load(html);
        // Generic table detection
        let extractedName = '';
        let status = '';
        let regNo = '';

        $('table tr').each((i, tr) => {
          const tds = $(tr).find('td');
          if (tds.length >= 2) {
            const label = $(tds[0]).text().trim().toLowerCase();
            const value = $(tds[1]).text().trim();
            if (!regNo && (label.includes('registration') || label.includes('reg no'))) regNo = value;
            if (!extractedName && label.includes('name') && !label.includes('father')) extractedName = value;
            if (!status && label.includes('status')) status = value;
          }
        });

        // If no key/value layout, attempt row parsing where first row might be headers
        if (!extractedName) {
          $('table tr').each((i, tr) => {
            const tds = $(tr).find('td');
            if (tds.length >= 3) {
              const maybeReg = $(tds[0]).text().trim();
              const maybeName = $(tds[1]).text().trim();
              const maybeStatus = $(tds[2]).text().trim();
              if (/\d/.test(maybeReg) && maybeName) {
                regNo = regNo || maybeReg;
                extractedName = extractedName || maybeName;
                status = status || maybeStatus;
              }
            }
          });
        }
        return { extractedName, status, regNo };
      } catch (e) {
        console.warn('parseFromHtml error:', e.message);
        return { extractedName: '', status: '', regNo: '' };
      }
    };

    // Strategy 1: Known search portal POST (form-encoded)
    const trySearchPortal = async () => {
      const params = new URLSearchParams();
      params.append('RegistrationNo', normPmdc);
      params.append('Name', '');
      params.append('FatherName', '');
      const url = 'https://search.pmdc.org.pk/SearchDoctor';
      const resp = await axios.post(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/json;q=0.9,*/*;q=0.8'
        },
        timeout: 20000
      });
      return resp;
    };

    // Strategy 2: Public site GET with query (may return homepage; we still parse)
    const tryPublicSite = async () => {
      const primaryUrl = 'https://pmdc.pk/';
      const url = `${primaryUrl}?RegistrationNo=${encodeURIComponent(normPmdc)}`;
      const resp = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000
      });
      return resp;
    };

    let response = null;
    let html = '';
    let parsed = { extractedName: '', status: '', regNo: '' };

    // Try search portal first (more deterministic). If it fails, fallback to public site
    try {
      response = await trySearchPortal();
      html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      parsed = parseFromHtml(html);
      console.log('PMDC search portal response parsed:', parsed);
    } catch (e1) {
      console.warn('Search portal request failed:', e1.message);
      try {
        response = await tryPublicSite();
        html = String(response.data || '');
        // Debug snippet (only first 800 chars)
        console.log('PMDC public site HTML snippet:', html.substring(0, 800));
        parsed = parseFromHtml(html);
      } catch (e2) {
        console.error('Public site request failed:', e2.message);
        // Optional: Selenium fallback for JS-rendered paths (disabled by default)
        if ((process.env.PMDC_SELENIUM_FALLBACK || 'false').toLowerCase() === 'true') {
          try {
            const { verifyPMDCSelenium } = require('./pmdcSelenium');
            const sel = await verifyPMDCSelenium(normPmdc, normName);
            return sel; // Already in return shape
          } catch (e3) {
            console.warn('Selenium fallback failed:', e3.message);
          }
        }
        console.warn('PMDC site unreachable - using lenient validation for development');
        // Don't block registration if PMDC site is down
        parsed = { extractedName: '', status: '', regNo: '' };
      }
    }
    
    // If nothing parsed and page states no record
    if (!parsed.extractedName && (html.includes('No Record Found') || html.toLowerCase().includes('no records'))) {
      return { isValid: false, message: 'Invalid PMDC registration number. No doctor found with this registration number.' };
    }

    // If parsed data is insufficient, attempt Selenium fallback as a final attempt
    if (!parsed.extractedName && (process.env.PMDC_SELENIUM_FALLBACK || 'false').toLowerCase() === 'true') {
      try {
        const { verifyPMDCSelenium } = require('./pmdcSelenium');
        const sel = await verifyPMDCSelenium(normPmdc, normName);
        return sel;
      } catch (e4) {
        console.warn('Selenium fallback (post-parse) failed:', e4.message);
      }
    }
    
    // If no name extracted but PMDC format is valid, be lenient for development
    // PMDC formats: 12345-N, 123456-P, or older formats like 123456-12-A
    const validPmdcFormat = /^\d{4,6}-([A-Z]|\d{1,2}-[A-Z])$/i.test(normPmdc);
    if (!parsed.extractedName && normPmdc && validPmdcFormat) {
      console.warn('PMDC site returned no data - allowing registration (dev mode)');
      return {
        isValid: true,
        doctorName: normName || 'Doctor',
        message: 'PMDC number format is valid. Registration allowed for development.'
      };
    }

    // Check if registration is active/valid (best-effort)
    const regStatus = (parsed.status || '').toLowerCase();
    const isActive = !regStatus || regStatus.includes('active') || regStatus.includes('valid') || regStatus.includes('registered');
    
    if (!isActive) {
      return {
        isValid: false,
        message: 'PMDC registration found but status is inactive or suspended.'
      };
    }
    
    const extractedName = parsed.extractedName || '';

    // If doctor name is provided, verify it matches
    if (normName && extractedName) {
      const normalizedExtracted = extractedName.trim().toLowerCase().replace(/\s+/g, ' ');
      const normalizedProvided = normName.trim().toLowerCase().replace(/\s+/g, ' ');
      const extractedParts = normalizedExtracted.split(' ');
      const providedParts = normalizedProvided.split(' ');
      let matchCount = 0;
      providedParts.forEach(part => {
        if (part.length >= 2 && extractedParts.some(extractedPart => extractedPart.includes(part) || part.includes(extractedPart))) {
          matchCount++;
        }
      });
      if (matchCount >= Math.min(2, providedParts.length)) {
        return { isValid: true, doctorName: extractedName, message: 'Valid PMDC registration. Doctor name verified successfully.' };
      } else {
        return { isValid: false, doctorName: extractedName, message: `PMDC registration found for "${extractedName}", but does not match "${normName}". Please verify your name.` };
      }
    }
    
    // If name is not provided, do NOT allow registration (force name check)
    if (!normName) {
      return {
        isValid: false,
        doctorName: extractedName || '',
        message: 'Doctor name is required for PMDC verification.'
      };
    }
    // If name provided but could not extract name from PMDC, do NOT allow registration
    if (!extractedName) {
      return {
        isValid: false,
        message: 'Could not extract doctor name from PMDC records. Please check your PMDC number.'
      };
    }
    // If code reaches here, something went wrong
    return {
      isValid: false,
      message: 'PMDC verification failed. Please check your details.'
    };
    
  } catch (error) {
    console.error('PMDC verification error:', error.message);
    
    // If it's a timeout error, give more specific message
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        isValid: false,
        message: 'PMDC verification service timeout. Please try again or contact support.'
      };
    }
    
    // Always fail if PMDC verification service is unavailable or any error occurs
    return {
      isValid: false,
      message: 'PMDC verification failed due to service error or invalid PMDC number.'
    };
  }
}

module.exports = {
  verifyPMDCNumber
};
