import { IsString, IsNotEmpty, IsOptional, IsISO8601 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVerificationDto {
  @ApiProperty({
    example: 'prov-123',
    description: 'Unique ID from your system',
  })
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @ApiProperty({
    example: 'US',
    description: 'ISO 3166-1 alpha-2 country code',
  })
  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @ApiProperty({ example: 'Gregory' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'House' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    example: '1234567893',
    description: 'Professional license number',
  })
  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @ApiPropertyOptional({
    example: '1959-05-15',
    description: 'ISO 8601 Date string',
  })
  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;
}
