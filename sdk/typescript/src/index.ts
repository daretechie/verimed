/**
 * VeriMed TypeScript SDK
 * 
 * Auto-generated client for VeriMed API
 * Version: 1.0.0
 * 
 * Usage:
 * ```typescript
 * import { VeriMedClient } from '@verimed/sdk';
 * 
 * const client = new VeriMedClient({
 *   baseUrl: 'https://api.verimed.app',
 *   apiKey: 'your-api-key',
 * });
 * 
 * const result = await client.verify({
 *   providerId: 'dr-123',
 *   countryCode: 'US',
 *   firstName: 'John',
 *   lastName: 'Smith',
 *   licenseNumber: '1234567890',
 * });
 * ```
 */

export interface VeriMedConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface VerificationRequest {
  providerId: string;
  countryCode: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  dateOfBirth?: string;
}

export interface VerificationResult {
  transactionId: string;
  status: 'VERIFIED' | 'REJECTED' | 'PENDING' | 'MANUAL_REVIEW' | 'ERROR';
  method: 'API_REGISTRY' | 'AI_DOCUMENT' | 'MANUAL';
  confidenceScore: number;
  verifiedAt: string;
  details?: Record<string, unknown>;
}

export interface BatchVerificationRequest {
  providers: VerificationRequest[];
}

export interface BatchVerificationResult {
  batchId: string;
  total: number;
  processed: number;
  results: Array<{
    providerId: string;
    transactionId: string;
    status: string;
    error?: string;
  }>;
  startedAt: string;
  completedAt: string;
}

export interface HealthCheckResult {
  status: string;
  info: Record<string, { status: string }>;
  error?: Record<string, unknown>;
  details: Record<string, { status: string }>;
}

export class VeriMedError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = 'VeriMedError';
  }
}

export class VeriMedClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: VeriMedConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new VeriMedError(
          error.message || `HTTP ${response.status}`,
          response.status,
          error,
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof VeriMedError) throw error;
      throw new VeriMedError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
      );
    }
  }

  /**
   * Verify a healthcare provider
   */
  async verify(request: VerificationRequest): Promise<VerificationResult> {
    return this.request<VerificationResult>('POST', '/v1/verify', request);
  }

  /**
   * Verify multiple providers in batch (Enterprise)
   */
  async verifyBatch(request: BatchVerificationRequest): Promise<BatchVerificationResult> {
    return this.request<BatchVerificationResult>('POST', '/v1/verify/batch', request);
  }

  /**
   * Get verification status by transaction ID
   */
  async getVerification(transactionId: string): Promise<VerificationResult> {
    return this.request<VerificationResult>('GET', `/v1/verify/${transactionId}`);
  }

  /**
   * Health check
   */
  async health(): Promise<HealthCheckResult> {
    return this.request<HealthCheckResult>('GET', '/health');
  }

  /**
   * Get pending reviews (requires JWT)
   */
  async getPendingReviews(): Promise<VerificationResult[]> {
    return this.request<VerificationResult[]>('GET', '/v1/reviews');
  }

  /**
   * Get list of supported countries
   */
  getSupportedCountries(): Array<{
    code: string;
    name: string;
    registry: string;
    apiStatus: 'full' | 'manual_review';
  }> {
    return [
      { code: 'US', name: 'USA', registry: 'NPI (NPPES)', apiStatus: 'full' },
      { code: 'FR', name: 'France', registry: 'ANS (RPPS)', apiStatus: 'full' },
      { code: 'AE', name: 'UAE', registry: 'DHA', apiStatus: 'full' },
      { code: 'NL', name: 'Netherlands', registry: 'BIG-register', apiStatus: 'full' },
      { code: 'IL', name: 'Israel', registry: 'MOH', apiStatus: 'full' },
      { code: 'GB', name: 'UK', registry: 'GMC', apiStatus: 'manual_review' },
      { code: 'CA', name: 'Canada', registry: 'Provincial Colleges', apiStatus: 'manual_review' },
      { code: 'AU', name: 'Australia', registry: 'AHPRA', apiStatus: 'manual_review' },
      { code: 'DE', name: 'Germany', registry: 'Bundesärztekammer', apiStatus: 'manual_review' },
      { code: 'ZA', name: 'South Africa', registry: 'HPCSA', apiStatus: 'manual_review' },
      { code: 'BR', name: 'Brazil', registry: 'CFM', apiStatus: 'manual_review' },
    ];
  }
}

// Default export
export default VeriMedClient;
