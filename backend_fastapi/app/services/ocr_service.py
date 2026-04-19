"""
OCR Service for Medical Report Text Extraction
Supports: JPG, PNG, JPEG, PDF
"""

import os
import logging
from typing import Dict, Optional
from PIL import Image
import pytesseract
import PyPDF2
from pdf2image import convert_from_path
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class OCRService:
    """Extract text from medical reports using Tesseract OCR"""
    
    def __init__(self):
        # Set Tesseract path (Windows)
        # For production, install Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
        tesseract_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            r"C:\Users\hp Probook\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"
        ]
        
        for path in tesseract_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                logger.info(f"✅ Tesseract found at: {path}")
                break
        else:
            logger.warning("⚠️ Tesseract not found. OCR may not work. Install from: https://github.com/UB-Mannheim/tesseract/wiki")
    
    async def extract_text_from_image(self, image_path: str) -> Dict:
        """
        Extract text from image using OCR
        
        Args:
            image_path: Path to image file (JPG, PNG, JPEG)
            
        Returns:
            Dict with extracted text and metadata
        """
        try:
            logger.info(f"📸 Extracting text from image: {image_path}")
            
            # Open image
            image = Image.open(image_path)
            
            # Perform OCR
            extracted_text = pytesseract.image_to_string(image, lang='eng')
            
            if not extracted_text.strip():
                logger.warning("⚠️ No text extracted from image")
                return {
                    "success": False,
                    "error": "No text could be extracted from the image. Please ensure the image is clear and readable."
                }
            
            logger.info(f"✅ Extracted {len(extracted_text)} characters")
            
            # Parse medical report information
            report_data = self.parse_medical_report(extracted_text)
            
            return {
                "success": True,
                "raw_text": extracted_text,
                "parsed_data": report_data,
                "extracted_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ OCR extraction error: {e}")
            return {
                "success": False,
                "error": f"Failed to extract text: {str(e)}"
            }
    
    async def extract_text_from_pdf(self, pdf_path: str) -> Dict:
        """
        Extract text from PDF report
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Dict with extracted text and metadata
        """
        try:
            logger.info(f"📄 Extracting text from PDF: {pdf_path}")
            
            # Try to use PyPDF2 for text extraction first (doesn't need poppler)
            try:
                import PyPDF2
                with open(pdf_path, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    all_text = []
                    for page in pdf_reader.pages:
                        text = page.extract_text()
                        if text.strip():
                            all_text.append(text)
                    
                    if all_text:
                        extracted_text = "\n\n=== PAGE BREAK ===\n\n".join(all_text)
                        logger.info(f"✅ Extracted {len(extracted_text)} characters using PyPDF2")
                        
                        # Parse medical report information
                        report_data = self.parse_medical_report(extracted_text)
                        
                        return {
                            "success": True,
                            "raw_text": extracted_text,
                            "parsed_data": report_data,
                            "pages": len(pdf_reader.pages),
                            "extracted_at": datetime.now().isoformat(),
                            "method": "PyPDF2"
                        }
            except Exception as pypdf_error:
                logger.warning(f"⚠️ PyPDF2 extraction failed: {pypdf_error}. Trying image conversion...")
            
            # Fallback to pdf2image (requires poppler)
            try:
                images = convert_from_path(pdf_path)
            except Exception as pdf2img_error:
                logger.error(f"❌ pdf2image failed: {pdf2img_error}")
                return {
                    "success": False,
                    "error": "Failed to extract text from PDF: Unable to get page count. Is poppler installed and in PATH?. Please ensure the file is clear and readable."
                }
            
            if not images:
                return {
                    "success": False,
                    "error": "Could not convert PDF to images"
                }
            
            # Extract text from all pages
            all_text = []
            for i, image in enumerate(images):
                logger.info(f"📄 Processing page {i+1}/{len(images)}")
                text = pytesseract.image_to_string(image, lang='eng')
                all_text.append(text)
            
            extracted_text = "\n\n=== PAGE BREAK ===\n\n".join(all_text)
            
            if not extracted_text.strip():
                return {
                    "success": False,
                    "error": "No text could be extracted from the PDF"
                }
            
            logger.info(f"✅ Extracted {len(extracted_text)} characters from {len(images)} pages")
            
            # Parse medical report information
            report_data = self.parse_medical_report(extracted_text)
            
            return {
                "success": True,
                "raw_text": extracted_text,
                "parsed_data": report_data,
                "pages": len(images),
                "extracted_at": datetime.now().isoformat(),
                "method": "OCR"
            }
            
        except Exception as e:
            logger.error(f"❌ PDF extraction error: {e}")
            return {
                "success": False,
                "error": f"Failed to extract text from PDF: {str(e)}"
            }
    
    def parse_medical_report(self, text: str) -> Dict:
        """
        Parse extracted text to identify key medical report fields
        
        Args:
            text: Raw extracted text
            
        Returns:
            Dict with parsed medical information
        """
        try:
            parsed_data = {
                "patient_name": self.extract_patient_name(text),
                "test_type": self.extract_test_type(text),
                "report_date": self.extract_date(text),
                "findings": self.extract_findings(text),
                "impression": self.extract_impression(text),
                "recommendations": self.extract_recommendations(text),
                "lab_name": self.extract_lab_name(text)
            }
            
            return parsed_data
            
        except Exception as e:
            logger.error(f"❌ Parsing error: {e}")
            return {}
    
    def extract_patient_name(self, text: str) -> Optional[str]:
        """Extract patient name from report"""
        patterns = [
            r"Patient\s*Name\s*[:\-]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)",
            r"Name\s*[:\-]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)",
            r"Patient\s*[:\-]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None
    
    def extract_test_type(self, text: str) -> Optional[str]:
        """Extract test type from report"""
        text_lower = text.lower()
        
        test_types = {
            "chest x-ray": ["chest x-ray", "chest xray", "cxr", "chest radiograph"],
            "ct scan": ["ct scan", "computed tomography", "ct chest"],
            "blood test": ["blood test", "cbc", "complete blood count"],
            "sputum test": ["sputum", "afb", "acid fast bacilli"],
            "pathology": ["pathology", "biopsy", "histopathology"],
            "ultrasound": ["ultrasound", "sonography", "usg"]
        }
        
        for test_name, keywords in test_types.items():
            if any(keyword in text_lower for keyword in keywords):
                return test_name
        
        return "Medical Report"
    
    def extract_date(self, text: str) -> Optional[str]:
        """Extract report date"""
        patterns = [
            r"Date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"Report\s*Date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return None
    
    def extract_findings(self, text: str) -> Optional[str]:
        """Extract findings/observations section"""
        patterns = [
            r"Findings?\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Observations?\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Results?\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
        return None
    
    def extract_impression(self, text: str) -> Optional[str]:
        """Extract impression/diagnosis section"""
        patterns = [
            r"Impression\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Diagnosis\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Conclusion\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
        return None
    
    def extract_recommendations(self, text: str) -> Optional[str]:
        """Extract recommendations/advice section"""
        patterns = [
            r"Recommendation[s]?\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Advice\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)",
            r"Suggested?\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z][a-z]*\s*:)[^\n]+)*)"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
        return None
    
    def extract_lab_name(self, text: str) -> Optional[str]:
        """Extract laboratory/hospital name"""
        # Look for common lab names
        labs = ["Chughtai", "IDC", "Excel", "Essa", "Diagnostic", "Laboratory", "Hospital"]
        
        for lab in labs:
            if lab.lower() in text.lower():
                # Try to extract full name
                pattern = rf"([A-Z][a-z]*\s*)*{lab}(\s*[A-Z][a-z]*)*"
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    return match.group(0).strip()
        
        return None

# Global OCR service instance
ocr_service = OCRService()
