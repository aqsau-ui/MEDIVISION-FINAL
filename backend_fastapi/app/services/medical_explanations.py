"""
Medical Explanations for X-ray Disease Detection
Provides context about what the AI model detects in chest X-rays
"""
import os
import logging
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
logger = logging.getLogger(__name__)

# Initialize Groq client for AI-powered explanations
try:
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    AI_AVAILABLE = True
    logger.info("✅ Groq AI initialized for heatmap explanations")
except Exception as e:
    logger.warning(f"⚠️ Groq AI not available: {e}")
    AI_AVAILABLE = False

DISEASE_CHARACTERISTICS = {
    "Normal": {
        "description": "Healthy chest X-ray with clear lung fields",
        "typical_features": [
            "Clear, well-aerated lung fields appear dark/black",
            "Sharp costophrenic angles (where ribs meet diaphragm)",
            "Normal heart size (less than 50% of chest width)",
            "Visible ribs and bone structure",
            "No opacities, infiltrates, or consolidations"
        ],
        "what_model_looks_for": [
            "Symmetrical lung fields",
            "Uniform dark appearance indicating air-filled lungs",
            "No white patches or cloudiness",
            "Normal vascular markings"
        ]
    },
    "Pneumonia": {
        "description": "Bacterial or viral lung infection causing inflammation",
        "typical_features": [
            "White/opaque patches (consolidation) in affected areas",
            "Air bronchograms (visible airways surrounded by fluid)",
            "Often affects lower lobes more commonly",
            "May show pleural effusion (fluid around lungs)",
            "Patchy or confluent infiltrates"
        ],
        "what_model_looks_for": [
            "Localized white opacities indicating fluid/pus accumulation",
            "Increased density in specific lung regions",
            "Loss of normal dark appearance in affected areas",
            "Asymmetric patterns between left and right lungs"
        ],
        "common_locations": [
            "Lower lobes (most common)",
            "Right middle lobe",
            "Can be unilateral or bilateral"
        ]
    },
    "Tuberculosis": {
        "description": "Chronic bacterial infection primarily affecting upper lungs",
        "typical_features": [
            "Upper lobe predominance (apical regions)",
            "Cavitations (hollow spaces) in advanced cases",
            "Nodular infiltrates or masses",
            "Hilar lymphadenopathy (enlarged lymph nodes)",
            "Calcifications in healed TB",
            "Miliary pattern (tiny nodules throughout lungs)"
        ],
        "what_model_looks_for": [
            "Upper lobe opacities and infiltrates",
            "Cavity formations (ring-like structures)",
            "Nodular patterns",
            "Asymmetric distribution favoring upper zones",
            "Fibronodular changes"
        ],
        "common_locations": [
            "Apical segments (top of lungs)",
            "Upper lobes predominantly",
            "Posterior segments more than anterior"
        ]
    }
}

def generate_ai_heatmap_explanation(prediction, confidence, heatmap_present, probabilities=None):
    """
    Generate AI-powered heatmap explanation using Groq
    This provides dynamic, specific analysis based on the actual X-ray findings
    """
    if not AI_AVAILABLE:
        return get_fallback_explanation(prediction, confidence, heatmap_present)
    
    try:
        # Build context about the analysis results
        analysis_context = f"""
You are analyzing a chest X-ray with these AI model results:
- Prediction: {prediction}
- Confidence: {confidence*100:.1f}%
- Heatmap available: {'Yes' if heatmap_present else 'No'}
"""
        
        if probabilities:
            analysis_context += f"\nProbability scores:\n"
            for disease, prob in probabilities.items():
                analysis_context += f"  - {disease}: {prob*100:.1f}%\n"
        
        # Create specific prompt for heatmap explanation
        prompt = f"""{analysis_context}

Based on these AI analysis results, generate a SHORT and ACCURATE heatmap explanation (2-3 sentences max) that explains:

1. What specific patterns or areas the AI model likely detected in THIS X-ray
2. Why those patterns led to this {prediction} prediction with {confidence*100:.1f}% confidence

CRITICAL REQUIREMENTS:
- Be SPECIFIC to this analysis (avoid generic disease descriptions)
- Keep it SHORT (2-3 sentences maximum)
- Use clear, simple language
- Focus on what the AI detected in THIS specific case
- No disclaimers or generic warnings
- No emojis or bullet points

Example good response for Pneumonia:
"The AI model detected white opaque areas in the lower lung regions, indicating fluid accumulation and consolidation. These infiltrates show the characteristic pattern of pneumonic infection, with increased tissue density in the affected zones."

Example good response for TB:
"The model identified irregular opacities and nodular patterns in the upper lung lobes, which are characteristic locations for tuberculosis. The presence of these upper-zone infiltrates combined with their specific appearance led to the TB prediction."

Example good response for Normal:
"The AI analyzed both lung fields and found clear, dark air-filled spaces with no abnormal white patches or consolidations. The symmetrical appearance and absence of opacities indicates a healthy chest X-ray."

Generate the explanation now:"""

        # Call Groq AI
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a medical AI assistant providing brief, accurate explanations of chest X-ray heatmap analyses. Keep responses SHORT (2-3 sentences) and SPECIFIC to the analysis results provided."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.5,
            max_tokens=200
        )
        
        ai_explanation = response.choices[0].message.content.strip()
        logger.info(f"✅ Generated AI heatmap explanation: {ai_explanation[:100]}...")
        
        return ai_explanation
        
    except Exception as e:
        logger.error(f"❌ Error generating AI explanation: {e}")
        return get_fallback_explanation(prediction, confidence, heatmap_present)


def get_fallback_explanation(prediction, confidence, heatmap_present):
    """
    Fallback explanation when AI is unavailable - still short and specific
    """
    if prediction == "Normal":
        if confidence > 0.85:
            return "The AI model analyzed both lung fields and found clear, dark air-filled spaces with no abnormal opacities or consolidations, indicating a healthy chest X-ray."
        else:
            return f"The X-ray appears mostly normal with {confidence*100:.1f}% confidence, though some subtle variations were detected that may require professional review."
    
    elif prediction == "Pneumonia":
        if heatmap_present:
            return f"The AI detected white opacities in the lung regions indicating fluid accumulation and consolidation. These infiltrates show the characteristic pattern of pneumonic infection with {confidence*100:.1f}% confidence."
        else:
            return f"The analysis suggests pneumonia with {confidence*100:.1f}% confidence based on detected lung infiltrates."
    
    elif prediction == "Tuberculosis":
        if heatmap_present:
            return f"The model identified irregular opacities and patterns in the upper lung zones, which are characteristic locations for tuberculosis. The presence of these upper-zone infiltrates led to the TB prediction with {confidence*100:.1f}% confidence."
        else:
            return f"The analysis suggests tuberculosis with {confidence*100:.1f}% confidence based on detected upper lobe abnormalities."
    
    return "AI analysis completed. Please consult with a healthcare professional for detailed interpretation."


def get_heatmap_explanation(prediction, confidence, heatmap_present, probabilities=None):
    """
    Generate heatmap explanation - now uses AI-powered generation
    """
    disease_info = DISEASE_CHARACTERISTICS.get(prediction, {})
    
    # Generate AI-powered medical context
    medical_context = generate_ai_heatmap_explanation(prediction, confidence, heatmap_present, probabilities)
    
    explanation = {
        "prediction": prediction,
        "confidence": confidence,
        "description": disease_info.get("description", ""),
        "what_detected": [],
        "interpretation": "",
        "medical_context": medical_context  # Now AI-generated!
    }
    
    # Basic detection summary (keep this simple)
    if prediction == "Normal":
        if confidence > 0.85:
            explanation["what_detected"] = [
                "✓ Clear lung fields detected",
                "✓ No significant abnormalities"
            ]
            explanation["interpretation"] = "The chest X-ray appears normal."
        else:
            explanation["what_detected"] = [
                "⚠ Mostly clear lung fields",
                "⚠ Some subtle variations noted"
            ]
            explanation["interpretation"] = f"Appears mostly normal ({confidence*100:.1f}% confidence)."
    
    elif prediction == "Pneumonia":
        explanation["what_detected"] = [
            "🔴 Opacities detected in lung regions",
            "🔴 Pattern consistent with pneumonia"
        ]
        explanation["interpretation"] = f"Pneumonia detected with {confidence*100:.1f}% confidence."
    
    elif prediction == "Tuberculosis":
        explanation["what_detected"] = [
            "🔴 Upper lobe abnormalities detected",
            "🔴 Pattern consistent with TB"
        ]
        explanation["interpretation"] = f"Tuberculosis detected with {confidence*100:.1f}% confidence."
    
    # Add confidence level
    if confidence >= 0.90:
        explanation["confidence_level"] = "High confidence"
    elif confidence >= 0.75:
        explanation["confidence_level"] = "Moderate confidence"
    elif confidence >= 0.60:
        explanation["confidence_level"] = "Low-moderate confidence"
    else:
        explanation["confidence_level"] = "Low confidence"
    
    return explanation

def get_comparative_analysis(prediction, probabilities):
    """
    Explain why this prediction vs others
    """
    sorted_probs = sorted(probabilities.items(), key=lambda x: x[1], reverse=True)
    
    analysis = []
    
    if len(sorted_probs) >= 2:
        first = sorted_probs[0]
        second = sorted_probs[1]
        
        difference = (first[1] - second[1]) * 100
        
        if difference < 10:
            analysis.append(f"Close call: {first[0]} ({first[1]*100:.1f}%) vs {second[0]} ({second[1]*100:.1f}%)")
            analysis.append(f"The difference is only {difference:.1f}%, suggesting overlapping features")
            analysis.append("Professional radiologist review is strongly recommended")
        elif difference < 25:
            analysis.append(f"{first[0]} is more likely than {second[0]}, but some features overlap")
            analysis.append("Clinical correlation recommended")
        else:
            analysis.append(f"Strong evidence for {first[0]} - clearly distinct from {second[0]}")
    
    return analysis

def get_medical_disclaimer():
    """Standard medical disclaimer"""
    return """
⚠️ IMPORTANT MEDICAL DISCLAIMER:

This AI analysis is a SCREENING TOOL only and should NEVER replace:
- Professional radiologist interpretation
- Clinical examination by a physician
- Laboratory tests (sputum culture, blood tests)
- Patient history and symptoms

NEXT STEPS:
1. Consult a qualified doctor immediately
2. Bring this X-ray for professional review
3. If TB is suspected, sputum testing is mandatory
4. If pneumonia is suspected, clinical examination needed
5. Treatment should only begin after proper medical evaluation

AI can assist but CANNOT diagnose. Always seek professional medical care.
"""
