import {
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateVerificationDto } from './create-verification.dto';

/**
 * Batch Verification Request DTO
 *
 * Allows submitting multiple provider verifications in a single request.
 * Maximum 50 providers per batch.
 */
export class BatchVerificationDto {
  @ApiProperty({
    description: 'Array of verification requests (max 50)',
    type: [CreateVerificationDto],
    example: [
      {
        providerId: 'prov-001',
        countryCode: 'US',
        firstName: 'Gregory',
        lastName: 'House',
        licenseNumber: '1234567893',
      },
      {
        providerId: 'prov-002',
        countryCode: 'FR',
        firstName: 'Jean',
        lastName: 'Dupont',
        licenseNumber: 'RPPS12345678',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 provider is required' })
  @ArrayMaxSize(50, { message: 'Maximum 50 providers per batch' })
  @ValidateNested({ each: true })
  @Type(() => CreateVerificationDto)
  providers!: CreateVerificationDto[];
}

/**
 * Batch Verification Result
 */
export interface BatchVerificationResult {
  batchId: string;
  total: number;
  processed: number;
  results: {
    providerId: string;
    transactionId: string;
    status: string;
    error?: string;
  }[];
  startedAt: Date;
  completedAt?: Date;
}
