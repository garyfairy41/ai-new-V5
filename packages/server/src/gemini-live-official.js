import { GoogleGenAI, Modality } from '@google/genai';

export class GeminiLiveOfficial {
  constructor(options) {
    this.options = options;
    this.geminiSession = null;
    this.responseQueue = [];
    this.onReady = options.onReady;
    this.onServerContent = options.onServerContent;
    this.onError = options.onError;
    this.onClose = options.onClose;
  }

  async connect() {
    try {
      console.log('🔄 Connecting to Gemini Live API using official @google/genai...');
      console.log('🔧 Model:', this.options.model || 'gemini-2.0-flash-live-001');
      console.log('🔑 API Key length:', this.options.apiKey ? this.options.apiKey.length : 'MISSING');
      
      // Initialize GoogleGenAI client
      const ai = new GoogleGenAI({
        apiKey: this.options.apiKey
      });
      
      // Prepare configuration according to official API  
      const config = {
        responseModalities: [Modality.AUDIO],
        speechConfig: this.options.speechConfig || {
          voiceConfig: { 
            prebuiltVoiceConfig: { 
              voiceName: "Puck" 
            } 
          }
        },
        systemInstruction: this.options.systemInstruction,
        // Enable proper Voice Activity Detection to handle natural conversation flow
        // Less sensitive to background noise (kids, TV, ambient sounds)
        realtimeInputConfig: {
          automaticActivityDetection: {
            start_of_speech_sensitivity: 'START_SENSITIVITY_LOW',   // Less sensitive to background noise
            end_of_speech_sensitivity: 'END_SENSITIVITY_LOW',       // Less sensitive to ambient sounds
            silence_duration_ms: 2000,  // Wait 2 seconds of silence before considering speech ended
            prefix_padding_ms: 200      // Reduced padding to focus on main speaker
          }
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {}
      };

      console.log('🔧 Config:', JSON.stringify(config, null, 2));

      // Connect to Live API with callbacks
      this.geminiSession = await ai.live.connect({
        model: this.options.model || 'gemini-2.0-flash-live-001',
        callbacks: {
          onopen: () => {
            console.log('✅ Gemini Live session established');
            if (this.onReady) this.onReady();
          },
          onmessage: (message) => {
            console.log('📨 Received message from Gemini:', JSON.stringify(message, null, 2).substring(0, 200) + '...');
            this.responseQueue.push(message);
            if (this.onServerContent) this.onServerContent(message);
          },
          onerror: (error) => {
            console.error('❌ Gemini Live session error:', error);
            if (this.onError) this.onError(error);
          },
          onclose: (event) => {
            console.log('ℹ️ Gemini Live session closed:', event.reason);
            if (this.onClose) this.onClose();
          }
        },
        config: config
      });
      
      console.log('🎉 Gemini Live session connected successfully using official API');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Gemini Live:', error);
      if (this.onError) this.onError(error);
      return false;
    }
  }

  // Method for sending text (only when responding to user input)
  sendText(text) {
    if (!this.geminiSession) {
      console.error('Cannot send text, Gemini session not ready.');
      return false;
    }
    
    try {
      console.log(`�️ Sending text to Gemini: "${text}"`);
      this.geminiSession.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true
      });
      return true;
    } catch (error) {
      console.error('❌ Error sending text to Gemini:', error);
      return false;
    }
  }

  // Method for streaming audio
  sendAudio(base64AudioChunk) {
    if (!this.geminiSession) {
      console.error('Cannot send audio, Gemini session not ready.');
      return false;
    }
    
    try {
      this.geminiSession.sendRealtimeInput({
        audio: { 
          data: base64AudioChunk,
          mimeType: "audio/pcm;rate=24000" 
        },
      });
      return true;
    } catch (error) {
      console.error('❌ Error sending audio to Gemini:', error);
      return false;
    }
  }

  // Method for handling function call responses
  sendFunctionResponse(functionName, response) {
    if (!this.geminiSession) {
      console.error('Cannot send function response, Gemini session not ready.');
      return false;
    }
    
    try {
      console.log(`🔧 Sending function response for "${functionName}" to Gemini`);
      this.geminiSession.sendClientContent({
        turns: [{
          role: 'function',
          parts: [{ functionResponse: { name: functionName, response } }]
        }],
        turnComplete: true
      });
      return true;
    } catch (error) {
      console.error('❌ Error sending function response to Gemini:', error);
      return false;
    }
  }

  // Method to end the audio stream (useful for VAD)
  sendAudioStreamEnd() {
    if (!this.geminiSession) return false;
    
    try {
      this.geminiSession.sendRealtimeInput({ audioStreamEnd: true });
      console.log('🔚 Sent audio stream end signal');
      return true;
    } catch (error) {
      console.error('❌ Error sending audio stream end:', error);
      return false;
    }
  }

  // Close the session
  close() {
    if (this.geminiSession) {
      try {
        this.geminiSession.close();
        console.log('👋 Gemini session closed');
      } catch (error) {
        console.error('❌ Error closing Gemini session:', error);
      } finally {
        this.geminiSession = null;
      }
    }
  }
}