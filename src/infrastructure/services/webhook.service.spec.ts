import { WebhookService, WebhookEventType } from './webhook.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhookService', () => {
  let service: WebhookService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when webhook is not configured', () => {
    beforeEach(() => {
      mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };
      service = new WebhookService(mockConfigService as ConfigService);
    });

    it('should return false when sending without webhook URL', async () => {
      const result = await service.send(
        WebhookEventType.VERIFICATION_COMPLETED,
        {},
      );
      expect(result).toBe(false);
    });

    it('should report not configured', () => {
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('when webhook is configured', () => {
    beforeEach(() => {
      mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'WEBHOOK_URL') return 'https://example.com/webhook';
          if (key === 'WEBHOOK_SECRET') return 'test-secret';
          return undefined;
        }),
      };
      service = new WebhookService(mockConfigService as ConfigService);
    });

    it('should report configured', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should send webhook with correct payload', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      const result = await service.send(
        WebhookEventType.VERIFICATION_COMPLETED,
        {
          transactionId: 'tx-123',
          providerId: 'prov-001',
        },
      );

      expect(result).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://example.com/webhook',

        expect.objectContaining({
          event: 'verification.completed',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            transactionId: 'tx-123',
            providerId: 'prov-001',
          }),
        }),

        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            'X-Webhook-Signature': expect.any(String),
          }),
        }),
      );
    });

    it('should return false on network error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.send(
        WebhookEventType.VERIFICATION_COMPLETED,
        {},
      );

      expect(result).toBe(false);
    });
  });

  describe('notification helpers', () => {
    beforeEach(() => {
      mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'WEBHOOK_URL') return 'https://example.com/webhook';
          return undefined;
        }),
      };
      service = new WebhookService(mockConfigService as ConfigService);
      mockedAxios.post.mockResolvedValue({ status: 200 });
    });

    it('should send verification completed notification', async () => {
      await service.notifyVerificationCompleted(
        'tx-123',
        'prov-001',
        'VERIFIED',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should send batch completed notification', async () => {
      await service.notifyBatchCompleted('batch-001', 10, 8, 2);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should send expiring verification notification', async () => {
      await service.notifyExpiringVerification(
        'tx-123',
        'prov-001',
        14,
        '2025-01-15',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should send sanctions match notification', async () => {
      await service.notifySanctionsMatch('tx-123', 'prov-001', 'OIG_LEIE', {
        reason: 'excluded',
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });
});
