import { supabase } from '../lib/supabase';

export interface AuthorizationResult {
  authorized: boolean
  reason?: string
  remainingMinutes?: number
}

/**
 * Authorization service for call gating
 * This would typically make a call to your Supabase authorize-call function
 */
export class AuthorizationService {
  /**
   * Check if a user is authorized to make a call
   * This simulates the authorize-call function that would run on your backend
   */
  static async authorizeCall(
    userId: string, 
    callType: 'inbound' | 'outbound',
    estimatedDurationMinutes: number = 5
  ): Promise<AuthorizationResult> {
    try {
      // Get user profile from Supabase
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !user) {
        return {
          authorized: false,
          reason: 'User not found'
        };
      }

      // Check if user is active
      if (!user.is_active) {
        return {
          authorized: false,
          reason: 'Account is inactive'
        };
      }

      // Check feature permissions
      if (callType === 'inbound' && !user.can_use_inbound) {
        return {
          authorized: false,
          reason: 'Inbound calls not permitted for this plan'
        };
      }

      if (callType === 'outbound' && !user.can_use_outbound_dialer) {
        return {
          authorized: false,
          reason: 'Outbound dialer not permitted for this plan'
        };
      }

      // Check usage limits
      const remainingMinutes = user.monthly_minute_limit - user.minutes_used;
      
      if (remainingMinutes <= 0) {
        return {
          authorized: false,
          reason: 'Monthly minute limit exceeded',
          remainingMinutes: 0
        };
      }

      if (remainingMinutes < estimatedDurationMinutes) {
        return {
          authorized: false,
          reason: `Insufficient minutes remaining (${remainingMinutes} min available, ${estimatedDurationMinutes} min estimated)`,
          remainingMinutes
        };
      }

      // Authorization successful
      return {
        authorized: true,
        remainingMinutes
      };

    } catch (error) {
      console.error('Authorization check failed:', error);
      return {
        authorized: false,
        reason: 'Authorization service unavailable'
      };
    }
  }

  /**
   * Record call usage after a call completes
   * This would update the user's minutes_used in the database
   */
  static async recordCallUsage(
    userId: string,
    actualDurationMinutes: number
  ): Promise<boolean> {
    try {
      // Update user's minutes_used in the database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          minutes_used: supabase.raw(`minutes_used + ${actualDurationMinutes}`)
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to record call usage:', error);
        return false;
      }

      console.log(`Recorded ${actualDurationMinutes} minutes of usage for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to record call usage:', error);
      return false;
    }
  }


}