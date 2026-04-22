"""PMDC Verification — Selenium against pmdc.pk"""
import re, time, asyncio, logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

PMDC_URL = "https://pmdc.pk/"


# ── Public entry point ────────────────────────────────────────────────────────

async def verify_pmdc_number(pmdc_number: str, doctor_name: str = None) -> Dict:
    norm_pmdc = str(pmdc_number or "").upper().strip() \
                    .replace(" ", "").replace("–", "-").replace("—", "-")
    norm_name = (doctor_name or "").strip()

    logger.info(f"🔍 PMDC verify: {norm_pmdc} | {norm_name}")

    if not norm_pmdc:
        return {"isValid": False, "message": "Please enter your PMDC registration number."}
    if not norm_name:
        return {"isValid": False, "message": "Please enter your full name for verification."}
    if not re.match(r"^\d{3,7}(-\d{2})?-[A-Z]+$", norm_pmdc, re.I):
        return {"isValid": False,
                "message": f"Invalid PMDC format '{norm_pmdc}'. Expected format: 6170-P or 66728-P"}

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run_selenium, norm_pmdc, norm_name)


# ── Name helpers ──────────────────────────────────────────────────────────────

def _norm(s: str) -> str:
    s = s.lower().strip()
    for t in ("dr.", "dr ", "prof.", "prof ", "mr.", "mrs.", "ms."):
        s = s.replace(t, "")
    return " ".join(s.split())


def _names_match(entered: str, website: str) -> bool:
    """Fuzzy: every entered word must be a prefix/exact match of some website word."""
    ew = _norm(entered).split()
    ww = _norm(website).split()
    if not ew or not ww:
        return False
    matched = sum(
        1 for e in ew
        if any(e == w or w.startswith(e) or e.startswith(w) for w in ww)
    )
    score = matched / len(ew)
    logger.info(f"  name match '{_norm(entered)}' vs '{_norm(website)}' = {score:.2f}")
    return score >= 0.7


# ── Selenium core ─────────────────────────────────────────────────────────────

def _run_selenium(norm_pmdc: str, norm_name: str) -> Dict:
    driver = None
    try:
        import undetected_chromedriver as uc
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC

        options = uc.ChromeOptions()
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-extensions")
        options.add_argument("--window-size=1280,900")
        options.add_argument("--window-position=-2400,0")   # off-screen

        logger.info("Launching Chrome…")
        driver = uc.Chrome(options=options, version_main=147, use_subprocess=True)
        driver.set_page_load_timeout(40)

        # ── Load PMDC site ────────────────────────────────────────────────────
        try:
            driver.get(PMDC_URL)
        except Exception:
            pass   # partial load is fine
        time.sleep(5)
        logger.info(f"Page title: {driver.title!r}")

        # ── Strategy 1: Search by Registration Number (default tab) ──────────
        rows = _search_by_reg(driver, norm_pmdc)

        # ── Strategy 2: Search by Full Name ──────────────────────────────────
        if not rows:
            logger.info("Reg search empty — trying Full Name tab")
            rows = _search_by_name(driver, norm_name)

        driver.quit()

        if not rows:
            return {
                "isValid": False,
                "message": (
                    f"No record found for PMDC '{norm_pmdc}' on pmdc.pk. "
                    f"Please check your PMDC registration number."
                )
            }

        return _match(rows, norm_pmdc, norm_name)

    except Exception as e:
        if driver:
            try: driver.quit()
            except: pass
        logger.error(f"Selenium error: {e}", exc_info=True)
        return {"isValid": False,
                "message": "PMDC verification encountered an error. Please try again."}


# ── Search strategies ─────────────────────────────────────────────────────────

def _search_by_reg(driver, norm_pmdc: str) -> List[dict]:
    """
    Search by Registration Number — default active tab.
    Exact IDs from PMDC HTML:
      input id="DocRegNo"
      button class="fn-BtnDocRegNo"
    """
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    try:
        # Wait for the input to be present (exact id from HTML)
        inp = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "DocRegNo"))
        )
        driver.execute_script("arguments[0].value = '';", inp)
        driver.execute_script(f"arguments[0].value = '{norm_pmdc}';", inp)
        driver.execute_script("arguments[0].dispatchEvent(new Event('input'));", inp)
        time.sleep(0.5)
        logger.info(f"Typed PMDC into #DocRegNo: {norm_pmdc}")

        # Click exact search button (class from HTML: fn-BtnDocRegNo)
        btn = driver.find_element(By.CSS_SELECTOR, ".fn-BtnDocRegNo")
        driver.execute_script("arguments[0].click();", btn)
        logger.info("Clicked .fn-BtnDocRegNo")

        # Wait for results div to become visible (initially has d-none)
        WebDriverWait(driver, 15).until(
            lambda d: "d-none" not in d.find_element(By.CSS_SELECTOR, ".fn-resultDiv").get_attribute("class")
        )
        time.sleep(1)

        rows = _parse_results(driver)
        logger.info(f"Reg search returned {len(rows)} rows")
        return rows

    except Exception as e:
        logger.warning(f"Reg search error: {e}")
        return []


def _search_by_name(driver, norm_name: str) -> List[dict]:
    """
    Click Full Name tab (id=doc_name_tab), then search.
    Full name tab pane id="doc_name", input id="DocFullName".
    """
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    try:
        # Click the Full Name tab (id="doc_name_tab" from HTML)
        tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "doc_name_tab"))
        )
        driver.execute_script("arguments[0].click();", tab)
        logger.info("Clicked #doc_name_tab")
        time.sleep(2)

        # Input is inside #doc_name pane — id="DocFullName" (inferred from pattern DocRegNo → DocFullName)
        inp = None
        for sel in ["#DocFullName", "#doc_name input.search_field", "#doc_name input[type='text']"]:
            try:
                el = driver.find_element(By.CSS_SELECTOR, sel)
                if el.is_displayed():
                    inp = el
                    logger.info(f"Found name input: {sel}")
                    break
            except: continue

        if not inp:
            logger.warning("Name input not found")
            return []

        first_name = norm_name.split()[0]
        driver.execute_script("arguments[0].value = '';", inp)
        driver.execute_script(f"arguments[0].value = '{first_name}';", inp)
        driver.execute_script("arguments[0].dispatchEvent(new Event('input'));", inp)
        time.sleep(0.5)
        logger.info(f"Typed first name: {first_name}")

        # Search button for full name tab: class="fn-BtnDocFullName"
        btn = driver.find_element(By.CSS_SELECTOR, ".fn-BtnDocFullName")
        driver.execute_script("arguments[0].click();", btn)
        logger.info("Clicked .fn-BtnDocFullName")

        WebDriverWait(driver, 15).until(
            lambda d: "d-none" not in d.find_element(By.CSS_SELECTOR, ".fn-resultDiv").get_attribute("class")
        )
        time.sleep(1)

        rows = _parse_results(driver)
        logger.info(f"Name search returned {len(rows)} rows")
        return rows

    except Exception as e:
        logger.warning(f"Name search error: {e}")
        return []


def _parse_results(driver) -> List[dict]:
    """
    Parse results table inside .fn-resultDiv.
    Columns: Registration No. | Full Name | Father Name | Status | Detail
    """
    from selenium.webdriver.common.by import By

    rows = []
    try:
        result_div = driver.find_element(By.CSS_SELECTOR, ".fn-resultDiv")
        trs = result_div.find_elements(By.CSS_SELECTOR, "tbody tr")
        for tr in trs:
            tds = tr.find_elements(By.TAG_NAME, "td")
            if len(tds) >= 2:
                pmdc_val = tds[0].text.strip().upper()
                name_val = tds[1].text.strip()
                if pmdc_val or len(name_val) > 2:
                    rows.append({"pmdc": pmdc_val, "name": name_val})
                    logger.info(f"  Row: PMDC={pmdc_val!r} NAME={name_val!r}")
    except Exception as e:
        logger.warning(f"Parse error: {e}")
    return rows


# ── Match logic ───────────────────────────────────────────────────────────────

def _match(rows: List[dict], norm_pmdc: str, norm_name: str) -> Dict:
    # 1. Exact PMDC match
    for r in rows:
        site_pmdc = r["pmdc"].replace(" ", "")
        if norm_pmdc in site_pmdc or site_pmdc in norm_pmdc:
            if _names_match(norm_name, r["name"]):
                return {
                    "isValid": True,
                    "doctorName": r["name"],
                    "message": f"✓ Verified: Dr. {r['name']} — PMDC {r['pmdc']}"
                }
            else:
                return {
                    "isValid": False,
                    "message": (
                        f"PMDC {norm_pmdc} is registered to Dr. {r['name']} on pmdc.pk, "
                        f"but you entered '{norm_name}'. "
                        f"Please use the exact name shown on your PMDC certificate."
                    )
                }

    # 2. Name match but different PMDC
    for r in rows:
        if _names_match(norm_name, r["name"]):
            return {
                "isValid": False,
                "message": (
                    f"Dr. {r['name']} is registered with PMDC '{r['pmdc']}', "
                    f"not '{norm_pmdc}'. Please check your registration number."
                )
            }

    # 3. No match
    return {
        "isValid": False,
        "message": (
            f"No record found for PMDC '{norm_pmdc}' / name '{norm_name}' on pmdc.pk. "
            f"Please ensure both match your PMDC certificate exactly."
        )
    }
