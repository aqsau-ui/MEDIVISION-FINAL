"""TB Feature Validation Service - Reduces False Positive TB Predictions"""
import numpy as np
import cv2
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

class TBFeatureValidator:
    """
    Validates TB predictions by checking for specific radiological features
    Helps reduce false positive TB detections
    """
    
    def __init__(self):
        self.upper_zone_threshold = 0.4  # Percentage of upper zones
        self.opacity_threshold = 0.15  # Minimum opacity level
        
    def validate_tb_prediction(self, image_bytes, tb_probability, pneumonia_probability, normal_probability):
        """
        Validate if TB-specific features are present
        Returns adjusted prediction and confidence
        """
        try:
            # Convert image
            image = Image.open(io.BytesIO(image_bytes)).convert('L')
            img_array = np.array(image.resize((224, 224)))
            
            # Normalize
            img_normalized = img_array.astype('float32') / 255.0
            
            # Check TB-specific features
            has_upper_lobe_involvement = self._check_upper_lobe_opacity(img_normalized)
            has_significant_opacity = self._check_opacity_level(img_normalized)
            has_asymmetric_pattern = self._check_asymmetry(img_normalized)
            
            # Calculate feature score (0-1)
            feature_score = 0.0
            if has_upper_lobe_involvement:
                feature_score += 0.4
            if has_significant_opacity:
                feature_score += 0.3
            if has_asymmetric_pattern:
                feature_score += 0.3
            
            logger.info(f"TB Feature Validation Score: {feature_score:.2f}")
            logger.info(f"  - Upper lobe involvement: {has_upper_lobe_involvement}")
            logger.info(f"  - Significant opacity: {has_significant_opacity}")
            logger.info(f"  - Asymmetric pattern: {has_asymmetric_pattern}")
            
            # Decision logic
            # If TB probability is high but features don't match, reduce confidence
            if tb_probability > 0.5 and feature_score < 0.4:
                # Weak TB features - likely false positive
                logger.warning(f"⚠️ TB predicted with {tb_probability:.2%} but weak TB features (score: {feature_score:.2f})")
                
                # Check if pneumonia or normal is close
                if pneumonia_probability > 0.3:
                    # Likely pneumonia, not TB
                    return {
                        'adjusted_prediction': 'Pneumonia',
                        'adjusted_confidence': pneumonia_probability * 1.1,  # Boost pneumonia
                        'reason': 'TB-specific features (upper lobe involvement, cavitations) not clearly present. Opacity pattern suggests pneumonia.',
                        'original_tb_prob': tb_probability,
                        'feature_score': feature_score,
                        'validation_passed': False
                    }
                elif normal_probability > 0.25:
                    # Likely normal or unclear
                    return {
                        'adjusted_prediction': 'Normal',
                        'adjusted_confidence': normal_probability * 1.15,  # Boost normal
                        'reason': 'TB-specific features not detected. Upper zones appear relatively clear.',
                        'original_tb_prob': tb_probability,
                        'feature_score': feature_score,
                        'validation_passed': False
                    }
                else:
                    # Reduce TB confidence
                    return {
                        'adjusted_prediction': 'Tuberculosis',
                        'adjusted_confidence': tb_probability * 0.7,  # Reduce confidence
                        'reason': 'TB predicted but classical features are subtle. Professional review strongly recommended.',
                        'original_tb_prob': tb_probability,
                        'feature_score': feature_score,
                        'validation_passed': False
                    }
            
            # If TB probability is moderate and features are weak
            elif 0.4 < tb_probability <= 0.6 and feature_score < 0.5:
                # Very uncertain - need professional review
                return {
                    'adjusted_prediction': 'Unclear - Professional Review Required',
                    'adjusted_confidence': 0.5,
                    'reason': f'Model confidence for TB is moderate ({tb_probability:.1%}) but classical TB features are not clearly visible. This requires expert radiologist evaluation.',
                    'original_tb_prob': tb_probability,
                    'feature_score': feature_score,
                    'validation_passed': False
                }
            
            # Features support TB diagnosis
            else:
                logger.info(f"✅ TB features validated (score: {feature_score:.2f})")
                return {
                    'adjusted_prediction': 'Tuberculosis',
                    'adjusted_confidence': min(tb_probability * (1 + feature_score * 0.2), 0.98),  # Boost if features present
                    'reason': 'TB-specific features detected: upper lobe involvement and/or cavitary changes.',
                    'original_tb_prob': tb_probability,
                    'feature_score': feature_score,
                    'validation_passed': True
                }
                
        except Exception as e:
            logger.error(f"TB validation error: {e}")
            # Return original prediction on error
            return {
                'adjusted_prediction': 'Tuberculosis',
                'adjusted_confidence': tb_probability,
                'reason': 'Validation error - using original model prediction',
                'original_tb_prob': tb_probability,
                'feature_score': 0.0,
                'validation_passed': None
            }
    
    def _check_upper_lobe_opacity(self, img_array):
        """Check if upper 1/3 of lungs shows significant opacity (TB characteristic)"""
        try:
            height = img_array.shape[0]
            upper_third = img_array[0:height//3, :]
            
            # Calculate mean brightness (lower = more opaque/white)
            upper_mean = np.mean(upper_third)
            
            # Compare to middle third
            middle_third = img_array[height//3:2*height//3, :]
            middle_mean = np.mean(middle_third)
            
            # TB typically shows LOWER values (whiter) in upper zones
            # If upper is significantly darker than middle, suggests upper lobe disease
            opacity_difference = middle_mean - upper_mean
            
            # If upper zones are at least 5% whiter than middle
            has_upper_opacity = opacity_difference > 0.05
            
            logger.debug(f"Upper zone opacity check: difference={opacity_difference:.3f}, threshold=0.05")
            
            return has_upper_opacity
        except Exception as e:
            logger.error(f"Upper lobe check error: {e}")
            return False
    
    def _check_opacity_level(self, img_array):
        """Check overall opacity level - TB shows moderate to high opacity"""
        try:
            # Calculate overall brightness
            mean_brightness = np.mean(img_array)
            
            # TB shows opacities - should not be too dark (all white) or too bright (all black)
            # Normal X-rays are mostly dark (high values ~0.7-0.9)
            # TB/Pneumonia show white patches (lower values ~0.4-0.6)
            
            # If image is too bright (dark in medical terms), it's likely normal
            if mean_brightness > 0.65:
                return False  # Too clear, unlikely TB
            
            # If moderate brightness (some white areas), could be disease
            if 0.35 < mean_brightness < 0.65:
                return True
            
            # If too dark (all white), might be overexposed or wrong image
            return False
            
        except Exception as e:
            logger.error(f"Opacity level check error: {e}")
            return False
    
    def _check_asymmetry(self, img_array):
        """Check for asymmetric patterns (TB often unilateral or asymmetric)"""
        try:
            height, width = img_array.shape
            
            # Split into left and right halves
            left_half = img_array[:, 0:width//2]
            right_half = img_array[:, width//2:]
            
            # Calculate mean brightness for each half
            left_mean = np.mean(left_half)
            right_mean = np.mean(right_half)
            
            # Calculate difference
            asymmetry = abs(left_mean - right_mean)
            
            # If difference is > 0.08, consider it asymmetric
            is_asymmetric = asymmetry > 0.08
            
            logger.debug(f"Asymmetry check: difference={asymmetry:.3f}, threshold=0.08")
            
            return is_asymmetric
            
        except Exception as e:
            logger.error(f"Asymmetry check error: {e}")
            return False

# Singleton instance
tb_validator = TBFeatureValidator()
