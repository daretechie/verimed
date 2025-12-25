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
    info: Record<string, {
        status: string;
    }>;
    error?: Record<string, unknown>;
    details: Record<string, {
        status: string;
    }>;
}
export declare class VeriMedError extends Error {
    statusCode: number;
    response?: unknown | undefined;
    constructor(message: string, statusCode: number, response?: unknown | undefined);
}
export declare class VeriMedClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    constructor(config: VeriMedConfig);
    private request;
    /**
     * Verify a healthcare provider
     */
    verify(request: VerificationRequest): Promise<VerificationResult>;
    /**
     * Verify multiple providers in batch (Enterprise)
     */
    verifyBatch(request: BatchVerificationRequest): Promise<BatchVerificationResult>;
    /**
     * Get verification status by transaction ID
     */
    getVerification(transactionId: string): Promise<VerificationResult>;
    /**
     * Health check
     */
    health(): Promise<HealthCheckResult>;
    /**
     * Get pending reviews (requires JWT)
     */
    getPendingReviews(): Promise<VerificationResult[]>;
    /**
     * Get list of supported countries
     */
    getSupportedCountries(): Array<{
        code: string;
        name: string;
        registry: string;
        apiStatus: 'full' | 'manual_review';
    }>;
}
export default VeriMedClient;
