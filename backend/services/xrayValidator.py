import sys
import json
import numpy as np
from PIL import Image
import io
import base64

def validate_chest_xray(image_data):
    """
    Validate if an image is a chest X-ray using advanced image analysis.
    
    Args:
        image_data: Base64 encoded image string or file path
    
    Returns:
        dict: Validation result with isChestXray boolean and details
    """
    try:
        # Decode base64 image
        if isinstance(image_data, str) and image_data.startswith('data:image'):
            # Remove data URL prefix
            image_data = image_data.split(',')[1]
        
        # Decode and open image
        img_bytes = base64.b64decode(image_data)
        img = Image.open(io.BytesIO(img_bytes))
        
        # Convert to grayscale and numpy array
        if img.mode != 'L':
            img_gray = img.convert('L')
        else:
            img_gray = img
        
        img_array = np.array(img_gray)
        
        # Feature extraction
        features = extract_features(img_array, img)
        
        # Validate features
        validation_result = validate_features(features)
        
        return validation_result
        
    except Exception as e:
        return {
            'isChestXray': False,
            'confidence': 0,
            'message': f'Error processing image: {str(e)}',
            'details': {}
        }

def extract_features(img_array, img):
    """Extract relevant features from the image."""
    features = {}
    
    # 1. Grayscale analysis
    if img.mode == 'L':
        features['is_grayscale'] = True
        features['grayscale_score'] = 1.0
    else:
        # Check if RGB image is essentially grayscale
        img_rgb = np.array(img)
        if len(img_rgb.shape) == 3:
            r, g, b = img_rgb[:,:,0], img_rgb[:,:,1], img_rgb[:,:,2]
            color_diff = np.mean(np.abs(r - g) + np.abs(g - b) + np.abs(r - b))
            features['is_grayscale'] = color_diff < 30
            features['grayscale_score'] = max(0, 1 - (color_diff / 100))
        else:
            features['is_grayscale'] = True
            features['grayscale_score'] = 1.0
    
    # 2. Intensity distribution (X-rays have specific intensity patterns)
    features['mean_intensity'] = float(np.mean(img_array))
    features['std_intensity'] = float(np.std(img_array))
    features['min_intensity'] = float(np.min(img_array))
    features['max_intensity'] = float(np.max(img_array))
    
    # 3. Contrast analysis
    features['contrast_ratio'] = float(features['max_intensity'] - features['min_intensity'])
    
    # 4. Histogram analysis
    hist, _ = np.histogram(img_array.flatten(), bins=256, range=[0, 256])
    features['histogram_peaks'] = len([i for i, v in enumerate(hist) if v > np.mean(hist) * 2])
    
    # 5. Edge density (X-rays have specific edge characteristics)
    edges = detect_edges_simple(img_array)
    features['edge_density'] = float(np.sum(edges) / edges.size)
    
    # 6. Aspect ratio (chest X-rays are typically portrait or square)
    height, width = img_array.shape
    features['aspect_ratio'] = float(width / height)
    features['width'] = width
    features['height'] = height
    
    # 7. Dark region analysis (lungs appear dark in X-rays)
    dark_threshold = features['mean_intensity'] - features['std_intensity']
    dark_pixels = np.sum(img_array < dark_threshold)
    features['dark_region_percentage'] = float(dark_pixels / img_array.size * 100)
    
    # 8. Bright region analysis (bones appear bright)
    bright_threshold = features['mean_intensity'] + features['std_intensity']
    bright_pixels = np.sum(img_array > bright_threshold)
    features['bright_region_percentage'] = float(bright_pixels / img_array.size * 100)
    
    # 9. Central region analysis (chest X-rays have central focus)
    center_h, center_w = height // 2, width // 2
    central_region = img_array[center_h-height//4:center_h+height//4, 
                               center_w-width//4:center_w+width//4]
    features['central_mean_intensity'] = float(np.mean(central_region))
    
    return features

def detect_edges_simple(img_array):
    """Simple edge detection using gradient."""
    # Sobel-like edge detection
    gy, gx = np.gradient(img_array.astype(float))
    gradient_magnitude = np.sqrt(gx**2 + gy**2)
    edges = gradient_magnitude > np.mean(gradient_magnitude)
    return edges

def validate_features(features):
    """Validate if features match chest X-ray characteristics."""
    score = 0
    max_score = 10
    reasons_pass = []
    reasons_fail = []
    
    # 1. Grayscale check (2 points)
    if features['grayscale_score'] > 0.8:
        score += 2
        reasons_pass.append("Image is grayscale")
    else:
        reasons_fail.append("Image should be grayscale (X-rays are not colored)")
    
    # 2. Intensity range check (1 point)
    if 40 < features['mean_intensity'] < 180:
        score += 1
        reasons_pass.append("Appropriate brightness for X-ray")
    else:
        reasons_fail.append("Image brightness unusual for chest X-ray")
    
    # 3. Contrast check (1 point)
    if features['contrast_ratio'] > 100:
        score += 1
        reasons_pass.append("Good contrast detected")
    else:
        reasons_fail.append("Insufficient contrast for medical imaging")
    
    # 4. Aspect ratio check (2 points)
    if 0.6 < features['aspect_ratio'] < 1.5:
        score += 2
        reasons_pass.append("Appropriate dimensions for chest X-ray")
    else:
        reasons_fail.append("Image dimensions unusual for chest X-ray (should be portrait/square)")
    
    # 5. Dark region check (1 point) - lungs
    if 15 < features['dark_region_percentage'] < 50:
        score += 1
        reasons_pass.append("Dark regions suggest lung fields")
    else:
        reasons_fail.append("Dark region distribution inconsistent with lung fields")
    
    # 6. Bright region check (1 point) - bones
    if 10 < features['bright_region_percentage'] < 40:
        score += 1
        reasons_pass.append("Bright regions suggest bone structures")
    else:
        reasons_fail.append("Bright region distribution inconsistent with skeletal structures")
    
    # 7. Edge density check (1 point)
    if 0.05 < features['edge_density'] < 0.25:
        score += 1
        reasons_pass.append("Edge characteristics match medical imaging")
    else:
        reasons_fail.append("Edge patterns unusual for chest X-ray")
    
    # 8. Resolution check (1 point)
    if features['width'] > 400 and features['height'] > 400:
        score += 1
        reasons_pass.append("Adequate resolution for analysis")
    else:
        reasons_fail.append("Image resolution too low for chest X-ray")
    
    # Calculate confidence
    confidence = (score / max_score) * 100
    is_chest_xray = score >= 6  # Need at least 60% score
    
    # Build message
    if is_chest_xray:
        message = f"Valid chest X-ray detected (Confidence: {confidence:.1f}%)"
    else:
        message = f"Not a chest X-ray. Issues detected: {', '.join(reasons_fail)}"
    
    return {
        'isChestXray': is_chest_xray,
        'confidence': round(confidence, 2),
        'score': score,
        'maxScore': max_score,
        'message': message,
        'reasons_pass': reasons_pass,
        'reasons_fail': reasons_fail,
        'details': {
            'grayscale_score': round(features['grayscale_score'], 2),
            'mean_intensity': round(features['mean_intensity'], 2),
            'contrast_ratio': round(features['contrast_ratio'], 2),
            'aspect_ratio': round(features['aspect_ratio'], 2),
            'dark_region_percentage': round(features['dark_region_percentage'], 2),
            'bright_region_percentage': round(features['bright_region_percentage'], 2),
            'edge_density': round(features['edge_density'], 4),
            'resolution': f"{features['width']}x{features['height']}"
        }
    }

if __name__ == '__main__':
    # Read input from command line
    if len(sys.argv) > 1:
        image_data = sys.argv[1]
        result = validate_chest_xray(image_data)
        print(json.dumps(result))
    else:
        print(json.dumps({
            'isChestXray': False,
            'message': 'No image data provided',
            'confidence': 0
        }))
