// Stub file for compatibility - RealtimeService functionality moved to polling in individual services
// This maintains compatibility with existing imports while the real-time features are replaced with API polling

export class RealtimeService {
  static subscribeToCallUpdates(_userId: string, _onUpdate?: () => void, _onInsert?: () => void, _onDelete?: () => void) {
    // Return a mock subscription object
    return {
      unsubscribe: () => {}
    };
  }

  static subscribeToCampaignUpdates(_userId: string, _onUpdate?: () => void, _onInsert?: () => void, _onDelete?: () => void) {
    return {
      unsubscribe: () => {}
    };
  }

  static subscribeToAgentUpdates(_userId: string, _onUpdate?: () => void, _onInsert?: () => void, _onDelete?: () => void) {
    return {
      unsubscribe: () => {}
    };
  }

  static subscribeToDNCUpdates(_userId: string, _onUpdate?: () => void, _onInsert?: () => void, _onDelete?: () => void) {
    return {
      unsubscribe: () => {}
    };
  }

  static subscribeToAppointmentUpdates(_userId: string, _onUpdate?: () => void, _onInsert?: () => void, _onDelete?: () => void) {
    return {
      unsubscribe: () => {}
    };
  }

  static subscribeToWebhookUpdates(_userId: string, _onUpdate?: () => void, _onInsert?: () => void, _onDelete?: () => void) {
    return {
      unsubscribe: () => {}
    };
  }

  static unsubscribe(subscription: unknown) {
    if (subscription && typeof subscription === 'object' && 'unsubscribe' in subscription && typeof subscription.unsubscribe === 'function') {
      subscription.unsubscribe();
    }
  }
}