import { DatabaseService } from './database';

export class CallLifecycleService {
  private static intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start automatic call lifecycle management for a user
   */
  static startCallLifecycleAutomation(profileId: string) {
    // Clear any existing automation for this profile
    this.stopCallLifecycleAutomation(profileId);

    // Set up interval to check and update call statuses
    const interval = setInterval(async () => {
      await this.processCallTransitions(profileId);
    }, 10000); // Check every 10 seconds

    this.intervals.set(profileId, interval);
    console.log(`🔄 Started call lifecycle automation for profile ${profileId}`);
  }

  /**
   * Stop automatic call lifecycle management for a user
   */
  static stopCallLifecycleAutomation(profileId: string) {
    const interval = this.intervals.get(profileId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(profileId);
      console.log(`⏹️ Stopped call lifecycle automation for profile ${profileId}`);
    }
  }

  /**
   * Process call transitions for a profile
   */
  private static async processCallTransitions(profileId: string) {
    try {
      // Get calls that need status transitions
      const pendingCalls = await DatabaseService.getCallQueue(profileId);
      const activeCalls = await DatabaseService.getActiveCallLogs(profileId);

      // Transition pending calls to in_progress (simulate agent pickup)
      for (const call of pendingCalls) {
        if (call.status === 'pending') {
          const waitTime = Date.now() - new Date(call.created_at).getTime();
          
          // Transition to in_progress after 30 seconds (simulating agent pickup)
          if (waitTime > 30000) {
            await this.transitionCallToInProgress(call);
          }
          
          // Abandon calls after 5 minutes
          else if (waitTime > 300000) {
            await this.transitionCallToAbandoned(call);
          }
        }
      }

      // Transition active calls to completed (simulate call completion)
      for (const call of activeCalls) {
        if (call.status === 'in_progress') {
          const callDuration = Date.now() - new Date(call.started_at || call.created_at).getTime();
          
          // Complete calls after 2-5 minutes (random duration)
          const targetDuration = 120000 + Math.random() * 180000; // 2-5 minutes
          
          if (callDuration > targetDuration) {
            await this.transitionCallToCompleted(call);
          }
        }
      }

    } catch (error) {
      console.error('Error processing call transitions:', error);
    }
  }

  /**
   * Transition a pending call to in_progress
   */
  private static async transitionCallToInProgress(call: any) {
    try {
      const updatedCall = await DatabaseService.updateCallLog(call.id, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      });

      if (updatedCall) {
        console.log(`📞 Call ${call.id} (${call.phone_number_from}) transitioned to in_progress`);
      }
    } catch (error) {
      console.error(`Error transitioning call ${call.id} to in_progress:`, error);
    }
  }

  /**
   * Transition an active call to completed
   */
  private static async transitionCallToCompleted(call: any) {
    try {
      const endTime = new Date();
      const startTime = new Date(call.started_at || call.created_at);
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      const updatedCall = await DatabaseService.updateCallLog(call.id, {
        status: 'completed',
        ended_at: endTime.toISOString(),
        duration_seconds: durationSeconds,
        outcome: 'resolved',
        call_summary: this.generateCallSummary(call),
        transcript: this.generateTranscript(call),
        recording_url: `https://api.twilio.com/recordings/${call.call_sid}.mp3`
      });

      if (updatedCall) {
        console.log(`✅ Call ${call.id} (${call.phone_number_from}) completed after ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`);
      }
    } catch (error) {
      console.error(`Error transitioning call ${call.id} to completed:`, error);
    }
  }

  /**
   * Transition a pending call to abandoned
   */
  private static async transitionCallToAbandoned(call: any) {
    try {
      const updatedCall = await DatabaseService.updateCallLog(call.id, {
        status: 'abandoned',
        ended_at: new Date().toISOString(),
        outcome: 'abandoned',
        call_summary: 'Call abandoned - caller hung up before being connected to an agent'
      });

      if (updatedCall) {
        console.log(`❌ Call ${call.id} (${call.phone_number_from}) abandoned`);
      }
    } catch (error) {
      console.error(`Error transitioning call ${call.id} to abandoned:`, error);
    }
  }

  /**
   * Generate a realistic call summary
   */
  private static generateCallSummary(_call: any): string {
    const summaries = [
      'Customer called to inquire about account balance. Provided account information and resolved inquiry successfully.',
      'Customer reported billing issue. Reviewed account and processed adjustment. Issue resolved.',
      'Customer needed help with password reset. Guided through security verification and reset process completed.',
      'Customer called about recent order status. Provided tracking information and delivery details.',
      'General inquiry about services. Provided information about available plans and pricing.',
      'Customer called to update contact information. Successfully updated phone number and email address.',
      'Technical support request. Troubleshot connectivity issue and provided solution steps.',
      'Customer called to schedule appointment. Available slots reviewed and appointment booked.',
      'Billing question regarding recent charges. Explained charges and provided detailed breakdown.',
      'Customer feedback call. Collected satisfaction survey responses and noted improvement suggestions.'
    ];
    
    return summaries[Math.floor(Math.random() * summaries.length)];
  }

  /**
   * Generate a realistic transcript
   */
  private static generateTranscript(_call: any): string {
    const transcripts = [
      "Agent: Thank you for calling, how can I help you today?\nCaller: Hi, I need to check my account balance.\nAgent: I'd be happy to help with that. Can you verify your account number?\nCaller: Yes, it's 12345.\nAgent: Thank you. Your current balance is $125.50.\nCaller: Perfect, that's all I needed. Thank you!\nAgent: You're welcome! Have a great day.",
      
      "Agent: Good afternoon, how may I assist you?\nCaller: I'm having trouble with my recent bill.\nAgent: I'm sorry to hear that. Let me review your account. What specific issue are you seeing?\nCaller: There's a charge I don't recognize.\nAgent: I see the charge you're referring to. That's for the premium service upgrade from last month. Would you like me to explain the details?\nCaller: Oh yes, that makes sense now. Thank you for clarifying.\nAgent: You're welcome! Is there anything else I can help you with today?\nCaller: No, that's everything. Thanks again.",
      
      "Agent: Hello, thank you for calling. How can I help?\nCaller: I need to reset my password.\nAgent: I can help you with that. For security, I'll need to verify your identity first. Can you provide your phone number on file?\nCaller: Yes, it's 555-0123.\nAgent: Thank you. I'm sending a verification code to that number now. Please provide the code when you receive it.\nCaller: Got it, the code is 4567.\nAgent: Perfect. I've reset your password and sent the new temporary password to your email. You'll need to change it on your first login.\nCaller: Excellent, thank you so much!\nAgent: My pleasure! Have a wonderful day."
    ];
    
    return transcripts[Math.floor(Math.random() * transcripts.length)];
  }
}
