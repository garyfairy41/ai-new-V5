import { BidiGenerateContentRealtimeInput, BidiGenerateContentServerContent, BidiGenerateContentServerMessage, BidiRequest, GeminiLiveClientOptions } from '@tw2gem/gemini-live-client/src/gemini-live.dto';
import { CloseEvent, ErrorEvent, MessageEvent, WebSocket } from 'ws';

export class GeminiLiveClient {

    private static readonly DEFAULT_GEMINI_BIDI_SERVER = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

    private socket: WebSocket;
    public isReady: boolean = false;

    public onReady?: () => void;
    public onError?: (event: ErrorEvent) => void;
    public onClose?: (event: CloseEvent) => void;
    public onServerContent?: (serverContent: BidiGenerateContentServerContent) => void;

    constructor(
        private options: GeminiLiveClientOptions
    ) {
        const server = options.server;
        const baseUrl = server?.url || GeminiLiveClient.DEFAULT_GEMINI_BIDI_SERVER;
        
        // Add API key to URL
        const url = new URL(baseUrl);
        if (server?.apiKey) {
            url.searchParams.append('key', server.apiKey);
        }
        
        // Connect to Gemini Live
        this.socket = new WebSocket(url.toString());
        
        // Set up event handlers
        this.socket.onopen = this.handleOpen.bind(this);
        this.socket.onmessage = this.handleMessage.bind(this);
        this.socket.onerror = this.handleError.bind(this);
        this.socket.onclose = this.handleClose.bind(this);
    }
    
    private handleOpen() {
        console.log('Connected to Gemini Live');
        
        // Send initial setup request
        const initialRequest: BidiRequest = {
            setup: this.options.setup
        };
        
        this.socket.send(JSON.stringify(initialRequest));
    }
    
    private handleMessage(event: MessageEvent) {
        try {
            const data = JSON.parse(event.data.toString()) as BidiGenerateContentServerMessage;
            
            if (data.setupComplete) {
                // This is the initial response, indicating the connection is ready
                this.isReady = true;
                if (this.onReady) {
                    this.onReady();
                }
            } else if (data.serverContent) {
                // This is a content response
                if (this.onServerContent) {
                    this.onServerContent(data.serverContent);
                }
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }
    
    private handleError(event: ErrorEvent) {
        console.error('WebSocket error:', event);
        if (this.onError) {
            this.onError(event);
        }
    }
    
    private handleClose(event: CloseEvent) {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isReady = false;
        if (this.onClose) {
            this.onClose(event);
        }
    }
    
    public sendMessage(message: { type: 'text', text: string }) {
        if (!this.isReady) {
            console.warn('Cannot send message, connection not ready');
            return;
        }
        
        const request: BidiRequest = {
            clientContent: {
                turns: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: message.text
                            }
                        ]
                    }
                ],
                turnComplete: true
            }
        };
        
        this.socket.send(JSON.stringify(request));
    }
    
    public sendRealtimeInput(input: BidiGenerateContentRealtimeInput) {
        if (!this.isReady) {
            console.warn('Cannot send realtime input, connection not ready');
            return;
        }
        
        const request: BidiRequest = {
            realtimeInput: input
        };
        
        this.socket.send(JSON.stringify(request));
    }
    
    public close() {
        this.socket.close();
    }

    // Compatibility methods for server.ts
    public sendSetup() {
        // Already handled in handleOpen
    }

    public handlerMessage(event: MessageEvent) {
        this.handleMessage(event);
    }

    public sendText(text: string) {
        this.sendMessage({ type: 'text', text });
    }

    public sendRealTime(input: BidiGenerateContentRealtimeInput) {
        this.sendRealtimeInput(input);
    }

    public send(data: any) {
        this.socket.send(JSON.stringify(data));
    }
}