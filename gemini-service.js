import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyzes a call transcript to extract structured lead data based on sales requirements.
 * @param {string} transcript - The full text transcript of the call.
 * @param {string} systemInstruction - The system prompt provided for lead collection.
 * @returns {Promise<object>} A structured object with the extracted lead data.
 */
async function extractLeadDataFromTranscript(transcript, systemInstruction) {
    console.log('🤖 Analyzing transcript with Gemini for lead data extraction...');
    
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-pro-latest", 
            systemInstruction: systemInstruction || getDefaultLeadExtractionPrompt()
        });

        const prompt = `The outbound sales call has concluded. Analyze the following transcript and extract all available lead information into a structured JSON object. Focus on the required customer information for internet service sales.

Required Information to Extract:
1. Personal Info: Full name, email, phone, date of birth, SSN (last 4 digits only)
2. Address: Current address, previous address if they moved in the last year
3. Internet Service: Selected plan, speed, price, installation preferences
4. Payment: Payment method, autopay enrollment
5. Call Outcome: Whether they answered, data completeness, DNC request, qualified status

Transcript:
---
${transcript}
---

Provide a clean JSON object with this exact structure (fill with extracted data or leave empty strings if not found):

{
  "customerInfo": {
    "fullName": "",
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "dob": "",
    "ssn": "",
    "currentAddress": "",
    "previousAddress": "",
    "movedRecently": false
  },
  "orderInfo": {
    "selectedPlan": "",
    "internetSpeed": "",
    "price": "",
    "promotionalPrice": "",
    "contractLength": "",
    "installDateTime": "",
    "installationNotes": "",
    "paymentInfo": "",
    "autopayEnrollment": false
  },
  "callMetadata": {
    "callAnswered": true,
    "dataStatus": "Complete|Partial|Incomplete",
    "dncRequest": "Yes|No",
    "qualified": "Yes|No",
    "appointmentScheduled": "Yes|No",
    "dataCompletenessScore": "0-100%",
    "callOutcome": "answered|voicemail|no_answer",
    "missingFields": []
  }
}

JSON Output:`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean the response to ensure it's valid JSON
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(jsonString);
        
        // Calculate data completeness score
        const completenessScore = calculateDataCompleteness(extractedData);
        extractedData.callMetadata.dataCompletenessScore = `${completenessScore}%`;
        
        return extractedData;

    } catch (error) {
        console.error("🔴 Error extracting lead data from Gemini:", error);
        // Return a fallback object so the Google Sheet write doesn't completely fail
        return {
            customerInfo: { 
                fullName: "TRANSCRIPT_ANALYSIS_ERROR",
                phone: "",
                email: "",
                currentAddress: "",
                previousAddress: ""
            },
            orderInfo: {
                selectedPlan: "",
                installDateTime: "",
                paymentInfo: ""
            },
            callMetadata: { 
                dataStatus: "Error", 
                dncRequest: "Unknown",
                qualified: "No",
                appointmentScheduled: "No",
                dataCompletenessScore: "0%",
                callAnswered: false,
                callOutcome: "error"
            }
        };
    }
}

/**
 * Calculates the data completeness percentage based on required fields
 * @param {object} data - The extracted lead data
 * @returns {number} Percentage of completeness (0-100)
 */
function calculateDataCompleteness(data) {
    const requiredFields = [
        data.customerInfo?.fullName,
        data.customerInfo?.email, 
        data.customerInfo?.phone,
        data.customerInfo?.currentAddress,
        data.orderInfo?.selectedPlan,
        data.orderInfo?.installDateTime,
        data.orderInfo?.paymentInfo
    ];
    
    const completedFields = requiredFields.filter(field => field && field.trim() !== '').length;
    return Math.round((completedFields / requiredFields.length) * 100);
}

/**
 * Default system prompt for lead data extraction
 * @returns {string} The default prompt
 */
function getDefaultLeadExtractionPrompt() {
    return `You are an AI assistant specialized in extracting customer lead data from outbound internet sales call transcripts. 

Your task is to identify and extract the following information:
- Personal details (name, email, phone, DOB, SSN last 4)
- Address information (current and previous if moved recently)
- Internet service preferences (plan, speed, price)
- Installation preferences (date, time, special instructions)
- Payment information (method, autopay preference)
- Call outcomes (answered, data quality, DNC requests, qualification status)

Extract only information that was explicitly mentioned in the conversation. Do not make assumptions or fill in data that wasn't discussed. If a customer requests to not be called again (DNC), mark this clearly.

Focus on accuracy and completeness while respecting customer privacy and preferences.`;
}

export { 
    extractLeadDataFromTranscript, 
    calculateDataCompleteness,
    getDefaultLeadExtractionPrompt 
};
