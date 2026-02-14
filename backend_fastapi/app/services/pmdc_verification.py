"""PMDC Verification Service - Verifies against pmdc.pk bypassing WAF"""
from typing import Dict
import logging
import re
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time

logger = logging.getLogger(__name__)

async def verify_pmdc_number(pmdc_number: str, doctor_name: str = None) -> Dict:
    """
    Verify PMDC number against pmdc.pk using Selenium - 100% verification
    
    Args:
        pmdc_number: PMDC registration number (e.g., 66728-P)
        doctor_name: Doctor's full name to verify (REQUIRED)
    
    Returns:
        Dict with isValid, doctorName, message
    """
    driver = None
    try:
        # Normalize
        norm_pmdc = str(pmdc_number or '').upper().strip().replace(' ', '').replace('–', '-').replace('—', '-')
        norm_name = doctor_name.strip() if doctor_name else None
        
        logger.info(f"🔍 100% Verification: PMDC {norm_pmdc} for {norm_name}")
        
        # Validate inputs
        if not norm_pmdc or len(norm_pmdc) < 5:
            return {"isValid": False, "message": "Please enter PMDC number"}
        
        if not norm_name or len(norm_name) < 2:
            return {"isValid": False, "message": "Please enter doctor's full name"}
        
        if not re.match(r'^\d{4,7}(-\d{2})?-[A-Z]+$', norm_pmdc, re.I):
            return {"isValid": False, "message": f"Invalid PMDC format: {norm_pmdc}"}
        
        # Setup UNDETECTED Chrome to bypass Fortinet WAF
        options = uc.ChromeOptions()
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--no-sandbox')
        options.add_argument('--window-size=800,600')  # Smaller window
        options.add_argument('--window-position=-2000,0')  # Position off-screen
        
        # Use undetected_chromedriver (bypasses Fortinet/CloudFlare/WAF)
        logger.info("Starting undetected Chrome to bypass WAF...")
        driver = uc.Chrome(options=options, version_main=144, use_subprocess=True)
        driver.set_page_load_timeout(10)
        
        # Load pmdc.pk
        logger.info("Loading pmdc.pk with anti-detection...")
        driver.get("https://pmdc.pk/")
        time.sleep(3)  # Wait for page load
        
        # Click "Full Name" tab
        logger.info("Switching to Full Name search...")
        try:
            name_tab = driver.find_element(By.ID, "doc_name_tab")
            driver.execute_script("arguments[0].click();", name_tab)
            time.sleep(2)
            logger.info("Clicked Full Name tab")
        except:
            logger.warning("Full Name tab not found")
        
        # Find name search input
        logger.info(f"Searching for doctor: {norm_name}")
        name_input = None
        
        try:
            name_input = driver.find_element(By.ID, "DocFullName")
        except:
            try:
                name_input = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='Name']")
            except:
                try:
                    inputs = driver.find_elements(By.TAG_NAME, "input")
                    for inp in inputs:
                        if inp.is_displayed() and inp.get_attribute("type") in ["text", "search", ""]:
                            name_input = inp
                            break
                except:
                    pass
        
        if not name_input:
            driver.quit()
            logger.error("Cannot find name input field")
            return {
                "isValid": False,
                "message": "pmdc.pk search unavailable. Please try again."
            }
        
        logger.info("Found name input field")
        
        # Enter name and search
        driver.execute_script(f"arguments[0].value = '{norm_name}';", name_input)
        time.sleep(1)
        
        # Click search button
        try:
            search_btn = driver.find_element(By.CSS_SELECTOR, ".fn-BtnDocFullName")
            driver.execute_script("arguments[0].click();", search_btn)
            logger.info("Clicked search button")
        except:
            try:
                search_btn = driver.find_element(By.XPATH, "//button[contains(@class, 'fn-Btn')]")
                driver.execute_script("arguments[0].click();", search_btn)
                logger.info("Clicked search button (fallback)")
            except:
                name_input.send_keys(Keys.RETURN)
                logger.info("Pressed Enter to search")
        
        # Wait for AJAX results to load using explicit wait
        logger.info("Waiting for results to load via JavaScript...")
        try:
            # Wait max 5 seconds for results table to have content
            WebDriverWait(driver, 5).until(
                lambda d: d.find_element(By.ID, "resultTBody").text.strip() != ""
            )
        except TimeoutException:
            pass  # Continue anyway, check below if empty
        
        # Check if results table has data
        try:
            results_tbody = driver.find_element(By.ID, "resultTBody")
            results_text = results_tbody.text.strip()
            
            if not results_text:
                logger.warning("Results table is empty")
                driver.quit()
                return {
                    "isValid": False,
                    "message": f"Doctor '{norm_name}' not found in pmdc.pk database. Please check the spelling."
                }
            
            logger.info(f"Results table has data: {results_text[:100]}")
            
        except:
            logger.error("Could not find results table #resultTBody")
            driver.quit()
            return {
                "isValid": False,
                "message": "Search failed - could not find results table"
            }
        
        # Parse results table - find matching doctor
        logger.info("Parsing search results...")
        found_match = False
        found_pmdc_on_website = None
        found_name_on_website = None
        
        try:
            tables = driver.find_elements(By.TAG_NAME, "table")
            
            for table in tables:
                rows = table.find_elements(By.TAG_NAME, "tr")
                
                for row in rows:
                    cells = row.find_elements(By.TAG_NAME, "td")
                    
                    if len(cells) >= 2:
                        # Column 0: Registration No, Column 1: Full Name
                        reg_no_on_site = cells[0].text.strip().upper()
                        full_name_on_site = cells[1].text.strip()
                        
                        # Check if this row is for the doctor we searched
                        if norm_name.upper() in full_name_on_site.upper() or full_name_on_site.upper() in norm_name.upper():
                            found_name_on_website = full_name_on_site
                            found_pmdc_on_website = reg_no_on_site
                            
                            # Now check if PMDC number matches
                            if norm_pmdc in reg_no_on_site:
                                found_match = True
                                logger.info(f"✓ MATCHED: {found_name_on_website} = {found_pmdc_on_website}")
                                break
                
                if found_match:
                    break
        
        except Exception as e:
            logger.error(f"Parse error: {e}")
        
        driver.quit()
        
        # Return verification results
        if found_match:
            # Both name and PMDC match - SUCCESS
            return {
                "isValid": True,
                "doctorName": found_name_on_website,
                "message": f"✓ Verified: Dr. {found_name_on_website}, PMDC {found_pmdc_on_website}"
            }
        elif found_name_on_website and found_pmdc_on_website:
            # Name matches but PMDC different - REJECT
            return {
                "isValid": False,
                "message": f"PMDC number mismatch! The website shows Dr. {found_name_on_website} has PMDC '{found_pmdc_on_website}', but you entered '{norm_pmdc}'. Please check your PMDC certificate."
            }
        elif found_name_on_website:
            # Name found but couldn't verify PMDC
            return {
                "isValid": False,
                "message": f"Found Dr. {found_name_on_website} but could not verify PMDC number. Please check your details."
            }
        else:
            # Doctor not found
            return {
                "isValid": False,
                "message": f"Doctor '{norm_name}' not found in pmdc.pk database. Please check the spelling and try again."
            }
    
    except TimeoutException:
        if driver:
            driver.quit()
        return {"isValid": False, "message": "pmdc.pk is slow. Please try again."}
    
    except Exception as e:
        if driver:
            try:
                driver.quit()
            except:
                pass
        logger.error(f"Error: {e}")
        return {"isValid": False, "message": "Verification failed. Please try again."}

