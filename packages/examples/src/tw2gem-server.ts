import { Tw2GemServer } from '@tw2gem/server';

const tw2gemServer = () => {
    const PORT = parseInt(process.env.PORT || '12001', 10);
    const server = new Tw2GemServer({
        serverOptions: {
            port: PORT
        },
        geminiOptions: {
            server: {
                apiKey: process.env.GOOGLE_API_KEY1,
            },
            setup: {
                model: 'models/gemini-2.0-flash-live-001',
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: 'Puck'
                        }
                    },
                    languageCode: 'es-US'
                },
                systemInstruction: {
                    parts: [{ text: 'Eres un asistente virtual de la tienda online store.com' }]
                },
                tools: []
            }
        }
    });

    server.onNewCall = () => {
        console.log('New call from twilio');
    };

    server.geminiLive.onReady = () => {
        console.log('Gemini Live connection is ready');
    };

    server.geminiLive.onClose = () => {
        console.log('Gemini Live connection is closed');
    };

    server.onError = (socket, event) => {
        console.error(event);
    };

    server.onClose = () => {
        console.log('End twilio call');
    };

    console.log(`WebSocket server is running in ${PORT}`);
};

tw2gemServer();