import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VerificationStatus } from '../../domain/enums/verification-status.enum';

export class ReviewVerificationDto {
  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.VERIFIED,
  })
  @IsEnum(VerificationStatus)
  status: VerificationStatus; // Should be VERIFIED or REJECTED

  @ApiProperty({ example: 'Documents verified manually via phone call' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
