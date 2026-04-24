const Groq = require('groq-sdk');
const fs = require('fs').promises;
const path = require('path');
const pdfParseModule = require('pdf-parse');
const pdfParse = typeof pdfParseModule === 'function'
  ? pdfParseModule
  : (pdfParseModule && typeof pdfParseModule.default === 'function'
      ? pdfParseModule.default
      : null);

class RAGService {
  constructor() {
    const groqApiKey = process.env.GROQ_API_KEY || '';
    const hasValidGroqKey = groqApiKey.startsWith('gsk_') && !groqApiKey.includes('your_');

    // Initialize Groq client
    this.groq = hasValidGroqKey
      ? new Groq({ apiKey: groqApiKey })
      : null;
    
    // Knowledge base storage
    this.knowledgeBase = {
      tb: null,
      pneumonia: null
    };

    this.systemPrompt = `You are Dr. Jarvis — a warm, caring AI doctor avatar who speaks directly to the patient like a real doctor would in a clinic. You specialise in chest X-ray analysis, pneumonia, and respiratory health.

PERSONALITY:
- Speak like a real, empathetic doctor — warm, calm, and reassuring
- Use "I" naturally: "I can see from your report that...", "I'd recommend..."
- Never sound robotic or templated — every answer should feel personalised
- Keep responses conversational and concise (3–6 sentences max)
- Use plain English — no jargon unless you explain it immediately

WHEN A REPORT IS SHARED:
- Reference specific details from the report (patient name, diagnosis, confidence %, medications)
- Explain what the finding means in simple terms
- Tell the patient clearly what their next steps should be
- Be reassuring but honest

WHEN NO REPORT IS SHARED:
- Answer general pneumonia / chest X-ray questions helpfully
- If asked about other health topics, say you focus on chest and lung health but give a brief helpful answer anyway

RULES:
- NEVER return a list of your own capabilities as an answer — that is not a response
- NEVER say "I don't see a report" if the patient just asked a general health question — just answer it
- NEVER use template phrases like "Great question!" or "As an AI..."
- NEVER repeat the same intro message as a response to a question
- Always end with one natural follow-up like "How are you feeling about this?" or "Let me know if you want me to explain anything else."

Keep responses under 100 words unless asked for more detail.`;

    if (!hasValidGroqKey) {
      console.warn('⚠️ GROQ_API_KEY is missing/placeholder. Using local fallback responses.');
    }
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
      console.log('📝 Processing query:', userMessage.substring(0, 120));

      if (!this.groq) {
        return {
          success: false,
          message: "I'm having trouble connecting right now. Please check back in a moment.",
          source: 'No Groq key'
        };
      }

      // Build knowledge base snippet for context (brief, not dumped in full)
      let kbSnippet = '';
      try {
        const lower = userMessage.toLowerCase();
        const wantsPneumonia = lower.includes('pneumonia') || lower.includes('chest') || lower.includes('lung') || lower.includes('xray') || lower.includes('x-ray') || lower.includes('breath') || lower.includes('cough');
        const wantsTB = lower.includes('tb') || lower.includes('tuberculosis');
        if (wantsPneumonia && this.knowledgeBase.pneumonia) {
          kbSnippet = `\n\nPNEUMONIA FACTS (use as needed):\n${JSON.stringify(this.knowledgeBase.pneumonia).slice(0, 1200)}`;
        } else if (wantsTB && this.knowledgeBase.tb) {
          kbSnippet = `\n\nTB FACTS (use as needed):\n${JSON.stringify(this.knowledgeBase.tb).slice(0, 1200)}`;
        }
      } catch {}

      const messages = [
        {
          role: 'system',
          content: this.systemPrompt + kbSnippet
        },
        // Keep last 6 messages (3 exchanges) for memory
        ...conversationHistory.slice(-6),
        {
          role: 'user',
          content: userMessage
        }
      ];

      console.log('🤖 Calling Groq AI...');
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.75,
        max_tokens: 350,
        top_p: 0.9,
      });

      const aiResponse = response.choices[0].message.content;
      console.log('✅ Groq responded:', aiResponse.substring(0, 80));

      return { success: true, message: aiResponse, source: 'Groq AI' };

    } catch (error) {
      console.error('❌ Groq error:', error.message);
      return {
        success: false,
        message: "I'm having a little trouble right now — could you ask me that again? I'm here to help.",
        error: error.message
      };
    }
  }

  getReportFallbackResponse(userMessage) {
    if (!userMessage || !userMessage.includes('The patient has shared their medical report')) {
      return null;
    }

    const reportMatch = userMessage.match(/"""([\s\S]*?)"""/);
    const reportText = (reportMatch && reportMatch[1] ? reportMatch[1] : '').toLowerCase();
    const question = (userMessage.split('Based on this report, answer the following question:').pop() || '').toLowerCase();

    const confMatch = reportText.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
    const confidence = confMatch ? parseFloat(confMatch[1]) : null;

    const hasPneumonia = /pneumonia/.test(reportText);
    const hasTB = /\b(tb|tuberculosis)\b/.test(reportText);
    const hasNormal = /\bnormal\b/.test(reportText) && !hasPneumonia && !hasTB;

    if (/serious|danger|critical|urgent/.test(question)) {
      if (hasPneumonia || hasTB) {
        if (confidence !== null) {
          return `Based on the uploaded report text, this can be clinically important and should be reviewed by a doctor soon. The report mentions ${hasTB ? 'TB-related findings' : 'pneumonia-related findings'} with around ${confidence}% confidence. Please follow your doctor\'s treatment plan and seek urgent care if breathing worsens, fever is high, or chest pain increases.`;
        }
        return `Based on the uploaded report text, this may be significant and should be reviewed by a doctor promptly. Please continue with the prescribed plan and seek urgent care if symptoms worsen.`;
      }
      if (hasNormal) {
        return 'Based on the uploaded report text, the result appears to be normal. If you still have symptoms, follow up with your doctor for a full clinical evaluation.';
      }
      return 'I received your report, but key diagnosis terms were not clear in the extracted text. Please share the diagnosis line or confidence value from the report so I can assess seriousness more accurately.';
    }

    return null;
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
      let extractedText = '';

      // ── Extract text from PDF ──────────────────────────────────────────
      if (fileType === 'application/pdf') {
        try {
          if (!pdfParse) {
            throw new Error('pdf-parse module is unavailable or incompatible in this runtime');
          }
          const pdfData = await pdfParse(fileBuffer);
          extractedText = (pdfData && pdfData.text) ? pdfData.text : '';
          console.log(`✅ PDF parsed: ${extractedText.length} characters extracted`);
        } catch (pdfErr) {
          console.error('PDF parse error:', pdfErr.message);
          extractedText = '';
        }
      }

      const hasText = extractedText && extractedText.trim().length > 50;

      // ── Groq summarises or greets based on whether text was extracted ──
      let summary = '';
      try {
        if (!this.groq) throw new Error('no groq');

        const systemMsg = `${this.systemPrompt}`;
        const userMsg = hasText
          ? `The patient has uploaded their MEDIVISION medical report. Here is the extracted text:\n\n"""\n${extractedText.slice(0, 4000)}\n"""\n\nGreet the patient warmly, tell them you've read their report, summarise the key findings (diagnosis, confidence %, patient name, doctor's recommendations/medications) in simple friendly language, and ask if they have any questions.`
          : `The patient just uploaded a MEDIVISION medical report PDF. The file appears to be image-based so text extraction wasn't possible. Greet them warmly, let them know you received their report, and tell them they can ask you anything about it — for example, what the diagnosis means, what the medications are for, or what they should do next. Keep it warm and natural, 3-4 sentences.`;

        const completion = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg }
          ],
          temperature: 0.75,
          max_tokens: 400,
        });
        summary = completion.choices[0]?.message?.content || '';
      } catch (groqErr) {
        console.error('Groq summary error:', groqErr.message);
        summary = hasText
          ? `I've read through your report! I can see it contains your medical analysis results. Feel free to ask me anything — what the diagnosis means, what you should do next, or about any medications mentioned.`
          : `I've received your medical report! Even though I couldn't read the text directly, you can ask me anything about it — just tell me what the report says or ask your questions and I'll guide you through it.`;
      }

      return {
        success: true,
        extractedText: extractedText || '',
        message: summary,
        requiresHumanReview: !hasText
      };

    } catch (error) {
      console.error('analyzeReport error:', error.message);
      return {
        success: false,
        extractedText: '',
        message: "I had trouble reading that file. Please make sure it's a valid PDF report and try again.",
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
