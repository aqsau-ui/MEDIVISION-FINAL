"""X-ray Disease Detection Service using DenseNet Model"""
import numpy as np
import cv2
from tensorflow import keras
import tensorflow as tf
from PIL import Image
import io
import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class XRayModelService:
    def __init__(self):
        self.model = None
        self.model_path = Path(__file__).parent.parent.parent.parent / "medivision_densenet_model" / "medivision_densenet_model.keras"
        self.class_names = ['Normal', 'Pneumonia', 'Tuberculosis']
        self.img_size = (224, 224)  # Standard DenseNet input size
        self.load_model()
    
    def load_model(self):
        """Load the trained DenseNet model"""
        try:
            self.model = keras.models.load_model(str(self.model_path))
            logger.info(f"✅ DenseNet model loaded from {self.model_path}")
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise
    
    def preprocess_image(self, image_bytes):
        """Preprocess uploaded X-ray image with enhancement for better detection"""
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            original_image = image.copy()
            
            # Convert to grayscale for processing
            gray_image = image.convert('L')
            gray_array = np.array(gray_image)
            
            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
            # This enhances local contrast and makes features more visible
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray_array)
            
            # Apply slight Gaussian blur to reduce noise
            denoised = cv2.GaussianBlur(enhanced, (3, 3), 0)
            
            # Sharpen to enhance edges
            kernel = np.array([[-1,-1,-1],
                              [-1, 9,-1],
                              [-1,-1,-1]])
            sharpened = cv2.filter2D(denoised, -1, kernel)
            
            # Convert back to RGB by duplicating grayscale channel
            enhanced_rgb = cv2.cvtColor(sharpened, cv2.COLOR_GRAY2RGB)
            
            # Convert to PIL Image
            enhanced_image = Image.fromarray(enhanced_rgb)
            
            # Resize to model input size
            enhanced_image = enhanced_image.resize(self.img_size)
            
            # Convert to numpy array
            img_array = np.array(enhanced_image)
            
            # Normalize pixel values to [0, 1]
            img_array = img_array.astype('float32') / 255.0
            
            # Add batch dimension
            img_array = np.expand_dims(img_array, axis=0)
            
            logger.info("✓ Image preprocessed with CLAHE, denoising, and sharpening")
            
            return img_array, original_image
        except Exception as e:
            logger.error(f"Image preprocessing error: {e}")
            raise
    
    def generate_heatmap(self, image_bytes, pred_class_idx):
        """Generate Grad-CAM heatmap for disease visualization"""
        try:
            # Preprocess image
            img_array, original_image = self.preprocess_image(image_bytes)
            
            # Get the last convolutional layer
            last_conv_layer = None
            for layer in reversed(self.model.layers):
                if 'conv' in layer.name.lower():
                    last_conv_layer = layer
                    break
            
            if last_conv_layer is None:
                logger.warning("No convolutional layer found for Grad-CAM")
                return None
            
            logger.info(f"Using layer for Grad-CAM: {last_conv_layer.name}")
            
            # Create gradient model - handle both single and multi-input models
            grad_model = keras.models.Model(
                inputs=self.model.inputs,
                outputs=[last_conv_layer.output, self.model.output]
            )
            
            # Compute gradients
            with tf.GradientTape() as tape:
                # Ensure input is in correct format
                model_input = img_array
                conv_outputs, predictions = grad_model(model_input)
                
                # Handle predictions - extract class channel
                if isinstance(predictions, list):
                    predictions = predictions[0]
                class_channel = predictions[:, pred_class_idx]
            
            # Get gradients of the predicted class with respect to conv layer
            grads = tape.gradient(class_channel, conv_outputs)
            
            # Compute mean of gradients (global average pooling)
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
            
            # Get numpy arrays
            conv_outputs_np = conv_outputs.numpy()[0]  # Remove batch dimension
            pooled_grads_np = pooled_grads.numpy()
            
            # Weight the conv outputs by gradients
            for i in range(len(pooled_grads_np)):
                conv_outputs_np[:, :, i] *= pooled_grads_np[i]
            
            # Create heatmap by averaging across channels
            heatmap = np.mean(conv_outputs_np, axis=-1)
            
            # Normalize heatmap
            heatmap = np.maximum(heatmap, 0)  # ReLU
            if np.max(heatmap) > 0:
                heatmap /= np.max(heatmap)  # Normalize to [0, 1]
            
            # Resize heatmap to original image size
            heatmap = cv2.resize(heatmap, self.img_size)
            
            # Convert to RGB heatmap
            heatmap = np.uint8(255 * heatmap)
            heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
            
            # Convert PIL image to numpy array for overlay
            original_array = np.array(original_image.convert('RGB'))
            
            # Ensure both images are same size
            if heatmap.shape[:2] != original_array.shape[:2]:
                heatmap = cv2.resize(heatmap, (original_array.shape[1], original_array.shape[0]))
            
            # Superimpose heatmap on original image (60% original, 40% heatmap)
            superimposed = cv2.addWeighted(original_array, 0.6, heatmap, 0.4, 0)
            
            # Convert BGR to RGB (OpenCV uses BGR)
            superimposed = cv2.cvtColor(superimposed, cv2.COLOR_BGR2RGB)
            
            # Convert to base64 for frontend display
            _, buffer = cv2.imencode('.png', superimposed)
            heatmap_base64 = base64.b64encode(buffer).decode('utf-8')
            
            logger.info(f"✅ Heatmap generated successfully")
            return f"data:image/png;base64,{heatmap_base64}"
            
        except Exception as e:
            logger.error(f"Heatmap generation error: {e}", exc_info=True)
            return None
    
    async def predict(self, image_bytes):
        """
        Predict disease from X-ray image
        
        Returns:
            dict: {
                'prediction': str (disease name),
                'confidence': float,
                'probabilities': {
                    'Normal': float,
                    'Pneumonia': float,
                    'Tuberculosis': float
                },
                'heatmap': str (base64 encoded image)
            }
        """
        try:
            # Preprocess image
            img_array, _ = self.preprocess_image(image_bytes)
            
            # Make prediction
            predictions = self.model.predict(img_array, verbose=0)
            pred_probs = predictions[0]
            
            # Get predicted class
            pred_class_idx = np.argmax(pred_probs)
            pred_class = self.class_names[pred_class_idx]
            confidence = float(pred_probs[pred_class_idx])
            
            # Create probabilities dict
            probabilities = {
                self.class_names[i]: float(pred_probs[i])
                for i in range(len(self.class_names))
            }
            
            # Generate heatmap (only if disease detected)
            heatmap = None
            if pred_class_idx > 0:  # Not Normal
                heatmap = self.generate_heatmap(image_bytes, pred_class_idx)
            
            result = {
                'prediction': pred_class,
                'confidence': confidence,
                'probabilities': probabilities,
                'heatmap': heatmap,
                'is_normal': pred_class == 'Normal'
            }
            
            logger.info(f"✅ Prediction: {pred_class} ({confidence:.2%})")
            
            return result
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            raise

# Singleton instance
xray_model_service = XRayModelService()
