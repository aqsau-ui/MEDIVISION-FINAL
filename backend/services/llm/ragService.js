const Groq = require('groq-sdk');
const fs = require('fs').promises;
const path = require('path');

class RAGService {
  constructor() {
    // Initialize Groq client
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'gsk_your_key_here'
    });
    
    // Knowledge base storage
    this.knowledgeBase = {
      tb: null,
      pneumonia: null
    };

    this.systemPrompt = `You are Dr. Jarvis, a friendly AI medical assistant specializing in tuberculosis (TB) and pneumonia.

COMMUNICATION STYLE:
- Use simple, everyday language (talk like explaining to a friend)
- Keep answers SHORT and natural (3-5 sentences)
- NO medical jargon - use common words
- NO emojis or special characters
- Answer directly, then stop

KNOWLEDGE SOURCE:
You have access to comprehensive medical knowledge about TB and Pneumonia from the knowledge base below. Use this information to answer questions accurately.

CRITICAL RULES:
- ONLY answer questions about TB, pneumonia, and lung/breathing issues
- If asked about other topics, say: "I specialize in TB and pneumonia. For other health concerns, please consult your doctor."
- NEVER say someone definitely has a disease - use "might suggest" or "could be"
- NEVER add disclaimers like "I'm an AI" or "consult a doctor" at the end
- Be direct and helpful
- Focus on the specific question asked

Keep responses under 100 words unless asked for more detail.`;
  }

  async initialize() {
    try {
      // Load knowledge base files
      const knowledgeBasePath = path.join(__dirname, '../../data/knowledge_base');
      
      const tbPath = path.join(knowledgeBasePath, 'tb_knowledge.json');
      const pneumoniaPath = path.join(knowledgeBasePath, 'pneumonia_knowledge.json');
      
      this.knowledgeBase.tb = JSON.parse(await fs.readFile(tbPath, 'utf8'));
      this.knowledgeBase.pneumonia = JSON.parse(await fs.readFile(pneumoniaPath, 'utf8'));
      
      console.log('✅ RAG Service initialized with comprehensive medical knowledge base');
      console.log('   - TB Knowledge: Loaded');
      console.log('   - Pneumonia Knowledge: Loaded');
      console.log('   - Groq AI: Ready');
    } catch (error) {
      console.error('❌ Error loading knowledge base:', error.message);
      console.log('⚠️  Will use fallback responses');
    }
  }

  // Get relevant medical knowledge from knowledge base
  getRelevantContext(query) {
    const queryLower = query.toLowerCase();
    let context = '';

    try {
      // Determine which disease the query is about
      const isTB = queryLower.includes('tb') || queryLower.includes('tuberculosis');
      const isPneumonia = queryLower.includes('pneumonia');

      // Build context from knowledge base
      if (isTB && this.knowledgeBase.tb) {
        context += `\n=== TUBERCULOSIS (TB) INFORMATION ===\n`;
        context += JSON.stringify(this.knowledgeBase.tb, null, 2);
      }

      if (isPneumonia && this.knowledgeBase.pneumonia) {
        context += `\n\n=== PNEUMONIA INFORMATION ===\n`;
        context += JSON.stringify(this.knowledgeBase.pneumonia, null, 2);
      }

      // If no specific disease mentioned, include both
      if (!isTB && !isPneumonia) {
        if (this.knowledgeBase.tb) {
          context += `\n=== TUBERCULOSIS (TB) INFORMATION ===\n`;
          context += JSON.stringify(this.knowledgeBase.tb, null, 2);
        }
        if (this.knowledgeBase.pneumonia) {
          context += `\n\n=== PNEUMONIA INFORMATION ===\n`;
          context += JSON.stringify(this.knowledgeBase.pneumonia, null, 2);
        }
      }

      if (context) {
        console.log(`✅ Retrieved ${context.length} characters from knowledge base`);
      }
    } catch (error) {
      console.error('❌ Error fetching knowledge base content:', error.message);
    }

    return context || 'No knowledge base content available. Using fallback.';
  }

  async processQuery(userMessage, conversationHistory = []) {
    try {
      console.log('📝 Processing query:', userMessage.substring(0, 100));
      
      // Get relevant context from knowledge base
      const relevantContext = this.getRelevantContext(userMessage);
      console.log('📚 Knowledge base context length:', relevantContext ? relevantContext.length : 0);

      // Check if we have knowledge base content
      if (relevantContext && relevantContext.length > 100 && !relevantContext.includes('No knowledge base content available')) {
        try {
          // Build messages for Groq AI
          const messages = [
            {
              role: 'system',
              content: `${this.systemPrompt}

COMPREHENSIVE MEDICAL KNOWLEDGE BASE:
${relevantContext}

Use this information to answer the user's question accurately. Be specific and helpful.`
            },
            ...conversationHistory.slice(-6), // Keep last 3 exchanges for context
            {
              role: 'user',
              content: userMessage
            }
          ];

          console.log('🤖 Calling Groq AI...');
          
          // Call Groq API
          const response = await this.groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: messages,
            temperature: 0.7,
            max_tokens: 400,
            top_p: 0.9
          });

          const aiResponse = response.choices[0].message.content;
          
          console.log('✅ Groq AI responded successfully');

          return {
            success: true,
            message: aiResponse,
            source: 'Groq AI + Knowledge Base'
          };
        } catch (apiError) {
          console.error('⚠️ Groq API error:', apiError.message);
          console.log('📖 Falling back to knowledge base extraction...');
          
          // Fall back to knowledge base extraction
          const extractedResponse = this.extractFromKnowledgeBase(userMessage);
          console.log('✅ Using knowledge base extraction');
          return {
            success: true,
            message: extractedResponse,
            source: 'Knowledge Base (AI unavailable)'
          };
        }
      }

      // If no knowledge base content, use fallback
      console.log('⚠️ No knowledge base content, using fallback');
      const fallbackMessage = this.getFallbackResponse(userMessage);
      return {
        success: true,
        message: fallbackMessage,
        source: 'Fallback'
      };

    } catch (error) {
      console.error('❌ Error in RAG processing:', error);
      console.error('Stack:', error.stack);
      
      // Use fallback response if everything fails
      const fallbackMessage = this.getFallbackResponse(userMessage);
      return {
        success: false,
        message: fallbackMessage,
        error: error.message
      };
    }
  }

  // Extract answer directly from knowledge base (when Groq AI unavailable)
  extractFromKnowledgeBase(query) {
    const queryLower = query.toLowerCase();
    
    try {
      let response = '';
      
      // Determine what the user is asking about
      const isTB = queryLower.includes('tb') || queryLower.includes('tuberculosis');
      const isPneumonia = queryLower.includes('pneumonia');
      
      // Check for specific topics
      const isSymptoms = queryLower.includes('symptom') || queryLower.includes('sign') || queryLower.includes('feel');
      const isTreatment = queryLower.includes('treatment') || queryLower.includes('cure') || queryLower.includes('medicine');
      const isDiagnosis = queryLower.includes('diagnos') || queryLower.includes('test') || queryLower.includes('x-ray') || queryLower.includes('xray');
      const isPrevention = queryLower.includes('prevent') || queryLower.includes('avoid') || queryLower.includes('protect');
      const isSpread = queryLower.includes('spread') || queryLower.includes('contagious') || queryLower.includes('catch');
      
      // Extract TB information
      if (isTB && this.knowledgeBase.tb) {
        const kb = this.knowledgeBase.tb;
        
        if (isSymptoms && kb.symptoms) {
          response = `Common TB symptoms:\n`;
          kb.symptoms.common.slice(0, 5).forEach(symptom => {
            response += `• ${symptom}\n`;
          });
          response += `\n${kb.symptoms.timeline}`;
        } else if (isTreatment && kb.treatment) {
          response = `${kb.treatment.overview}\n\nTreatment takes ${kb.treatment.duration} with these medicines:\n`;
          kb.treatment.medications.forEach(med => {
            response += `• ${med}\n`;
          });
          response += `\nImportant: ${kb.treatment.important_notes[0]}`;
        } else if (isDiagnosis && kb.diagnosis) {
          response = `TB is diagnosed through:\n`;
          kb.diagnosis.tests.slice(0, 4).forEach(test => {
            response += `• ${test}\n`;
          });
        } else if (isSpread && kb.transmission) {
          response = `${kb.transmission.how_it_spreads}\n\nRisk factors include:\n`;
          kb.transmission.risk_factors.slice(0, 3).forEach(factor => {
            response += `• ${factor}\n`;
          });
        } else {
          response = `${kb.overview.definition}\n\nKey points:\n• ${kb.overview.severity}\n• ${kb.overview.contagious}`;
        }
      }
      
      // Extract Pneumonia information
      if (isPneumonia && this.knowledgeBase.pneumonia) {
        const kb = this.knowledgeBase.pneumonia;
        
        if (isSymptoms && kb.symptoms) {
          response = `Common pneumonia symptoms:\n`;
          kb.symptoms.common.slice(0, 5).forEach(symptom => {
            response += `• ${symptom}\n`;
          });
          response += `\n${kb.symptoms.timeline}`;
        } else if (isTreatment && kb.treatment && kb.treatment.mild_cases) {
          response = `Mild pneumonia treatment:\n`;
          kb.treatment.mild_cases.medications.forEach(med => {
            response += `• ${med}\n`;
          });
          response += `\nHome care:\n`;
          kb.treatment.mild_cases.home_care.slice(0, 3).forEach(care => {
            response += `• ${care}\n`;
          });
          response += `\n${kb.treatment.mild_cases.duration}`;
        } else if (isDiagnosis && kb.diagnosis) {
          response = `Pneumonia is diagnosed through:\n`;
          kb.diagnosis.tests.slice(0, 4).forEach(test => {
            response += `• ${test}\n`;
          });
        } else if (isPrevention && kb.prevention) {
          response = `Prevention:\n\nVaccines:\n`;
          kb.prevention.vaccines.forEach(vax => {
            response += `• ${vax}\n`;
          });
        } else {
          response = `${kb.overview.definition}\n\nTypes:\n• Bacterial: ${kb.types.bacterial.description}\n• Viral: ${kb.types.viral.description}`;
        }
      }
      
      if (response) {
        return response;
      }
      
    } catch (error) {
      console.error('Error extracting from knowledge base:', error);
    }
    
    // Fallback if extraction fails
    return this.getFallbackResponse(query);
  }

  // Analyze uploaded medical report (image or PDF)
  async analyzeReport(fileBuffer, fileType) {
    try {
      // For now, return a template response
      // In production, you would use OCR (like Tesseract) or Vision API
      return {
        success: true,
        message: `I've received your medical report! 📄

**What I Can Help You With:**
• Explain what the X-ray or report says in simple words
• Help you understand medical terms and findings
• Explain what the AI detected (like pneumonia or TB signs)
• Answer questions about your symptoms
• Tell you about treatment options
• Help you prepare questions for your doctor

**What Would You Like to Know?**
Feel free to ask:
• "What does this report mean?"
• "Explain the AI findings in simple words"
• "What are these symptoms?"
• "What should I ask my doctor?"

I'm here to help! What's your question?`,
        requiresHumanReview: true
      };
    } catch (error) {
      return {
        success: false,
        message: "Oops! I had trouble reading your report. Please make sure it's a clear picture of your chest X-ray or medical paper about TB/Pneumonia.",
        error: error.message
      };
    }
  }

  // Fallback responses for when web scraping or API fails
  getFallbackResponse(query) {
    const queryLower = query.toLowerCase();
    
    // TB specific questions
    if (queryLower.includes('tb') || queryLower.includes('tuberculosis')) {
      return `**What is TB (Tuberculosis)?**

TB is a lung infection caused by bacteria. Think of it as germs attacking your lungs.

**Common Signs:**
• Bad cough lasting more than 3 weeks
• Coughing up blood (even small amounts)
• Night sweats (waking up very sweaty)
• Losing weight without trying
• Feeling tired all the time
• Fever that comes and goes

**How it Spreads:**
TB spreads through the air when someone coughs or sneezes. It's like catching a cold, but more serious.

**Good News:**
- TB can be completely cured with medicine
- Treatment takes 6 months but works very well
- After 2 weeks of medicine, you're much less contagious

**When to See a Doctor:**
- If you have a cough for more than 3 weeks
- If you're coughing up blood
- If you have unexplained weight loss

**Important:** TB is serious but treatable. Don't wait - see a doctor if you have these symptoms!

**Need More Help?**
Ask me anything about TB symptoms, treatment, or what your X-ray results mean!`;
    }
    
    // Pneumonia specific questions
    if (queryLower.includes('pneumonia')) {
      return `**What is Pneumonia?**

Pneumonia is a lung infection that makes breathing difficult. Your lungs get filled with fluid or pus.

**Common Signs:**
• Cough with mucus (yellow, green, or bloody)
• High fever with chills and sweating
• Hard time breathing or catching your breath
• Sharp chest pain when you breathe or cough
• Feeling very tired or weak
• Feeling confused (especially in older adults)

**Types:**
- Bacterial - Most common, needs antibiotics
- Viral - Like a bad flu, caused by viruses
- Fungal - Less common, affects weak immune systems

**Treatment:**
- Antibiotics for bacterial pneumonia (5-14 days)
- Rest and lots of fluids
- Medicine for fever and pain
- Most people feel better in 1-3 weeks

**When to Go to Hospital:**
- Can't breathe properly
- Lips or fingernails turning blue
- Chest pain is very bad
- Very high fever that won't go down
- Coughing up a lot of blood

**Who's at Higher Risk:**
• Babies and young kids
• People over 65
• Smokers
• People with weak immunity

**Need More Help?**
Ask me anything about pneumonia symptoms, treatment, or understanding your medical reports!`;
    }
    
    // Symptom questions
    if (queryLower.includes('symptom')) {
      return `**Signs You Might Have TB:**
• Bad cough for more than 3 weeks
• Coughing up blood (even tiny amounts)
• Night sweats (waking up very sweaty)
• Losing weight without trying
• Always feeling tired
• Fever that keeps coming back

**Signs You Might Have Pneumonia:**
• Cough with colored mucus (yellow or green)
• Very high fever with chills
• Hard to breathe
• Chest hurts when you cough
• Feeling confused (especially older people)
• Feeling sick to your stomach

**Big Difference:**
- TB - Symptoms start slowly over weeks or months
- Pneumonia - Symptoms start suddenly over a few days

**Have More Questions?**
I can help explain your symptoms, X-ray results, or treatment options!`;
    }
    
    // Treatment questions
    if (queryLower.includes('treatment') || queryLower.includes('cure') || queryLower.includes('medicine')) {
      return `**How to Treat TB:**
- You'll take 4 different pills for 6 months
- Yes, it takes long but it works!
- After 2 weeks of pills, you're less contagious
- NEVER skip your medicine or stop early
- TB can be 100% cured if you finish all medicine

**How to Treat Pneumonia:**
- Antibiotics for bacterial type (5-14 days)
- Rest at home and drink lots of water
- Medicine to bring down fever
- Most people feel better in 1-3 weeks
- Sometimes you need to stay in hospital

**Very Important:**
- Don't stop your medicine just because you feel better!
- Stopping early can make the germs stronger
- Then the medicine won't work anymore

**Questions About Your Treatment?**
I can help explain your medicine, side effects, or what to expect!`;
    }
    
    // X-ray questions
    if (queryLower.includes('x-ray') || queryLower.includes('xray') || queryLower.includes('radiograph')) {
      return `**What Does TB Look Like on X-ray:**
📸 White spots or holes in the upper part of your lungs
📸 Swollen lymph nodes (small bean-shaped parts)
📸 Sometimes fluid around the lungs
📸 Scattered white spots all over (if TB spread)

**What Does Pneumonia Look Like on X-ray:**
📸 Large white cloudy area (like fog in your lungs)
📸 Can be in any part of the lungs
📸 Sometimes white patches scattered around
📸 Sometimes fluid at the bottom

**Simple Explanation:**
Healthy lungs look black on X-ray (because they're full of air).
Sick lungs look white (because of infection, fluid, or damage).

⚠️ **Important:** Only a real X-ray doctor can read your scan properly. This is just general info!

**Have Your X-ray Results?**
I can help explain what the findings mean in simple words!`;
    }
    
    // Difference between TB and Pneumonia
    if (queryLower.includes('difference') || queryLower.includes('vs')) {
      return `**TB vs Pneumonia - What's the Difference?**

**How Fast It Starts:**
🐢 TB - Slowly over weeks or months
⚡ Pneumonia - Suddenly over a few days

**Fever:**
🌡️ TB - Mild fever, mostly in evenings
🌡️ Pneumonia - High fever with chills

**Cough:**
💨 TB - Dry cough that lasts more than 3 weeks
💨 Pneumonia - Cough with lots of mucus, starts quickly

**Weight Loss:**
📉 TB - Lose a lot of weight
📉 Pneumonia - Don't usually lose much weight

**How It Spreads:**
😷 TB - Very contagious through air (cough, sneeze)
😷 Pneumonia - Some types spread, some don't

**Treatment Time:**
⏰ TB - 6 months of medicine
⏰ Pneumonia - 5-14 days of medicine

**Want to Know More?**
I can explain symptoms, treatments, or help you understand your test results!`;
    }
    
    return "Hi! 👋 I'm Dr. Jarvis. I can help you understand:\n\n• TB and Pneumonia symptoms\n• Your X-ray or medical report results\n• AI findings from chest X-rays\n• Treatment options\n• Medical terms in simple words\n\nWhat would you like to know?";
  }
}

module.exports = new RAGService();
