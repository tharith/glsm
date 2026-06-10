import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Strict rate limit for auth endpoints:
 * - Login:   max 5 attempts per minute per IP (brute force protection)
 * - Refresh: max 20 per minute
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Track by IP address (not user ID, since user may not be known yet)
    return req.ips?.length ? req.ips[0] : req.ip;
  }
}
