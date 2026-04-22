"""
OCR Service for Medical Report Text Extraction
Supports: JPG, PNG, JPEG, PDF (image-based and text-based)
Uses pymupdf (fitz) for PDF rendering — no poppler required.
"""

import os
import logging
from typing import Dict, Optional
from PIL import Image
import pytesseract
import PyPDF2
import re
from datetime import datetime
import io

logger = logging.getLogger(__name__)


class OCRService:
    """Extract text from medical reports using Tesseract OCR"""

    def __init__(self):
        tesseract_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            r"C:\Users\hp Probook\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
        ]
        for path in tesseract_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                logger.info(f"✅ Tesseract found at: {path}")
                break
        else:
            logger.warning("⚠️ Tesseract not found. OCR may not work.")

    # ──────────────────────────────────────────────────────────────────────────
    # Image extraction
    # ──────────────────────────────────────────────────────────────────────────

    async def extract_text_from_image(self, image_path: str) -> Dict:
        try:
            logger.info(f"📸 Extracting text from image: {image_path}")
            image = Image.open(image_path)
            # Upscale small images for better OCR accuracy
            w, h = image.size
            if w < 1200:
                scale = 1200 / w
                image = image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            extracted_text = pytesseract.image_to_string(image, lang='eng')
            if not extracted_text.strip():
                return {"success": False, "error": "No text could be extracted from the image. Please ensure the image is clear and readable."}
            logger.info(f"✅ Extracted {len(extracted_text)} characters")
            report_data = self.parse_medical_report(extracted_text)
            return {
                "success": True,
                "raw_text": extracted_text,
                "parsed_data": report_data,
                "extracted_at": datetime.now().isoformat(),
                "method": "Tesseract-Image",
            }
        except Exception as e:
            logger.error(f"❌ OCR extraction error: {e}")
            return {"success": False, "error": f"Failed to extract text: {str(e)}"}

    # ──────────────────────────────────────────────────────────────────────────
    # PDF extraction — tries text layer first, then renders pages with pymupdf
    # ──────────────────────────────────────────────────────────────────────────

    async def extract_text_from_pdf(self, pdf_path: str) -> Dict:
        try:
            logger.info(f"📄 Extracting text from PDF: {pdf_path}")

            # ── Pass 1: text-layer extraction via PyPDF2 ──────────────────────
            try:
                with open(pdf_path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    pages_text = []
                    for page in reader.pages:
                        t = page.extract_text() or ""
                        if t.strip():
                            pages_text.append(t)
                if pages_text:
                    extracted_text = "\n\n".join(pages_text)
                    logger.info(f"✅ PyPDF2 extracted {len(extracted_text)} chars (text-based PDF)")
                    return {
                        "success": True,
                        "raw_text": extracted_text,
                        "parsed_data": self.parse_medical_report(extracted_text),
                        "pages": len(reader.pages),
                        "extracted_at": datetime.now().isoformat(),
                        "method": "PyPDF2",
                    }
            except Exception as e:
                logger.warning(f"⚠️ PyPDF2 failed: {e}")

            # ── Pass 2: render pages as images with pymupdf (no poppler needed) ─
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(pdf_path)
                all_text = []
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    # Render at 2× zoom for clearer OCR
                    mat = fitz.Matrix(2.0, 2.0)
                    pix = page.get_pixmap(matrix=mat, alpha=False)
                    img_bytes = pix.tobytes("png")
                    img = Image.open(io.BytesIO(img_bytes))
                    text = pytesseract.image_to_string(img, lang="eng")
                    if text.strip():
                        all_text.append(text)
                    logger.info(f"📄 Page {page_num + 1}/{len(doc)} processed")
                doc.close()

                if all_text:
                    extracted_text = "\n\n".join(all_text)
                    logger.info(f"✅ pymupdf+OCR extracted {len(extracted_text)} chars")
                    return {
                        "success": True,
                        "raw_text": extracted_text,
                        "parsed_data": self.parse_medical_report(extracted_text),
                        "pages": len(all_text),
                        "extracted_at": datetime.now().isoformat(),
                        "method": "PyMuPDF+Tesseract",
                    }
                else:
                    return {"success": False, "error": "No text could be extracted from the PDF pages. Please ensure the document is not blank."}

            except ImportError:
                logger.error("pymupdf not installed. Run: pip install pymupdf")
                return {
                    "success": False,
                    "error": "PDF rendering library not available. Please run: pip install pymupdf",
                }
            except Exception as e:
                logger.error(f"❌ pymupdf render failed: {e}")
                return {"success": False, "error": f"Failed to process PDF: {str(e)}"}

        except Exception as e:
            logger.error(f"❌ PDF extraction error: {e}")
            return {"success": False, "error": f"Failed to extract text from PDF: {str(e)}"}

    # ──────────────────────────────────────────────────────────────────────────
    # Parsing helpers
    # ──────────────────────────────────────────────────────────────────────────

    def parse_medical_report(self, text: str) -> Dict:
        try:
            return {
                "patient_name":    self.extract_patient_name(text),
                "test_type":       self.extract_test_type(text),
                "report_date":     self.extract_date(text),
                "findings":        self.extract_findings(text),
                "impression":      self.extract_impression(text),
                "recommendations": self.extract_recommendations(text),
                "lab_name":        self.extract_lab_name(text),
                "doctor_name":     self.extract_doctor_name(text),
                "medications":     self.extract_medications(text),
            }
        except Exception as e:
            logger.error(f"❌ Parsing error: {e}")
            return {}

    def extract_patient_name(self, text: str) -> Optional[str]:
        patterns = [
            r"Patient\s*Name\s*[:\-]?\s*([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)+)",
            r"Name\s*[:\-]?\s*([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)+)",
            r"Patient\s*[:\-]?\s*([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)+)",
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    def extract_doctor_name(self, text: str) -> Optional[str]:
        patterns = [
            r"Dr\.?\s*([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)+)",
            r"Doctor\s*[:\-]?\s*([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)+)",
            r"Prescribed\s+by\s*[:\-]?\s*([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)+)",
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    def extract_medications(self, text: str) -> Optional[str]:
        patterns = [
            r"Medication[s]?\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Medicine[s]?\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Prescription\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE | re.MULTILINE)
            if m:
                return m.group(1).strip()
        return None

    def extract_test_type(self, text: str) -> Optional[str]:
        text_lower = text.lower()
        test_types = {
            "chest x-ray":    ["chest x-ray", "chest xray", "cxr", "chest radiograph"],
            "ct scan":        ["ct scan", "computed tomography", "ct chest"],
            "blood test":     ["blood test", "cbc", "complete blood count"],
            "sputum test":    ["sputum", "afb", "acid fast bacilli"],
            "pathology":      ["pathology", "biopsy", "histopathology"],
            "ultrasound":     ["ultrasound", "sonography", "usg"],
            "prescription":   ["prescription", "prescribed by", "medication", "doctor's note"],
        }
        for name, kws in test_types.items():
            if any(k in text_lower for k in kws):
                return name
        return "Medical Report"

    def extract_date(self, text: str) -> Optional[str]:
        patterns = [
            r"Date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"(\d{1,2}\s+\w+\s+\d{4})",
        ]
        for p in patterns:
            m = re.search(p, text)
            if m:
                return m.group(1)
        return None

    def extract_findings(self, text: str) -> Optional[str]:
        patterns = [
            r"Findings?\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Observations?\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Results?\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE | re.MULTILINE)
            if m:
                return m.group(1).strip()
        return None

    def extract_impression(self, text: str) -> Optional[str]:
        patterns = [
            r"Impression\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Diagnosis\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Conclusion\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE | re.MULTILINE)
            if m:
                return m.group(1).strip()
        return None

    def extract_recommendations(self, text: str) -> Optional[str]:
        patterns = [
            r"Recommendation[s]?\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Advice\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Follow.?[Uu]p\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE | re.MULTILINE)
            if m:
                return m.group(1).strip()
        return None

    def extract_lab_name(self, text: str) -> Optional[str]:
        labs = ["Chughtai", "IDC", "Excel", "Essa", "Diagnostic", "Laboratory", "Hospital", "Clinic", "MEDIVISION"]
        for lab in labs:
            if lab.lower() in text.lower():
                pattern = rf"([A-Z][a-z]*\s*)*{lab}(\s*[A-Z][a-z]*)*"
                m = re.search(pattern, text, re.IGNORECASE)
                if m:
                    return m.group(0).strip()
        return None


# Global OCR service instance
ocr_service = OCRService()
