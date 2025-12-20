import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  Get,
  Param,
  NotFoundException,
  Inject,
  Put,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import * as FileType from 'file-type';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { VerifyProviderUseCase } from '../../application/use-cases/verify-provider.use-case';
import { CreateVerificationDto } from '../../application/dtos/create-verification.dto';
import { VerificationRequest } from '../../domain/entities/verification-request.entity';
import type { IVerificationRepository } from '../../domain/ports/verification-repository.port';
import { ReviewVerificationDto } from '../../application/dtos/review-verification.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';

@ApiTags('Verification')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@ApiResponse({ status: 429, description: 'Too many requests' })
@Controller('verify')
export class VerificationController {
  constructor(
    private readonly verifyProviderUseCase: VerifyProviderUseCase,
    @Inject('VerificationRepository')
    private readonly repository: IVerificationRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit a provider for verification' })
  @ApiResponse({ status: 201, description: 'Verification request processed.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        providerId: { type: 'string', default: 'prov-001' },
        countryCode: { type: 'string', default: 'US' },
        firstName: { type: 'string', default: 'Gregory' },
        lastName: { type: 'string', default: 'House' },
        licenseNumber: { type: 'string', default: '1234567893' },
        dateOfBirth: { type: 'string', format: 'date' },
        documents: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Medical License documents',
        },
        idDocument: {
          type: 'string',
          format: 'binary',
          description:
            'National ID or Passport (Optional, Recommended for high security)',
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'documents', maxCount: 5 },
      { name: 'idDocument', maxCount: 1 },
    ]),
  )
  async verify(
    @Body() dto: CreateVerificationDto,
    @UploadedFiles()
    files: {
      documents?: Express.Multer.File[];
      idDocument?: Express.Multer.File[];
    },
  ) {
    // Strict Content Type Validation (Magic Numbers)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    const validateFile = async (file: Express.Multer.File) => {
      const type = (await FileType.fromBuffer(file.buffer)) as
        | { mime: string; ext: string }
        | undefined;
      if (!type || !allowedMimeTypes.includes(type.mime)) {
        throw new BadRequestException(
          `Invalid file type for ${file.originalname}. Allowed: ${allowedMimeTypes.join(', ')}`,
        );
      }
      // Also check if the reported mimetype matches the detected one (optional but recommended)
      if (file.mimetype !== type.mime) {
        // We log a warning or adjust, but usually trust detected type more
      }
    };

    if (files?.documents) {
      for (const file of files.documents) {
        await validateFile(file);
      }
    }
    if (files?.idDocument?.[0]) {
      await validateFile(files.idDocument[0]);
    }

    // Convert the DTO (HTTP Layer) to the Domain Entity (Business Layer)
    const request = new VerificationRequest(
      dto.providerId,
      dto.countryCode,
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        licenseNumber: dto.licenseNumber,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      // If files were uploaded, pass them to the domain with metadata
      files?.documents
        ? files.documents.map((f) => ({
            buffer: f.buffer,
            mimetype: f.mimetype,
          }))
        : [],
      files?.idDocument?.[0]
        ? {
            buffer: files.idDocument[0].buffer,
            mimetype: files.idDocument[0].mimetype,
          }
        : undefined,
    );

    // Execute the logic
    return this.verifyProviderUseCase.execute(request);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get the status of a verification request' })
  @ApiParam({ name: 'id', description: 'The Transaction UUID' })
  @ApiResponse({ status: 200, description: 'The verification result.' })
  @ApiResponse({ status: 404, description: 'Verification not found.' })
  async getVerification(@Param('id') id: string) {
    const result = await this.repository.findById(id);

    if (!result) {
      throw new NotFoundException(`Verification transaction ${id} not found`);
    }
    return result;
  }

  @Put(':id/review')
  @UseGuards(AuthGuard('jwt'))
  @ApiSecurity('bearer')
  @ApiOperation({
    summary: 'Manually review (Approve/Reject) a pending verification',
  })
  @ApiParam({ name: 'id', description: 'The Transaction UUID' })
  @ApiResponse({ status: 200, description: 'Review submitted successfully.' })
  async reviewVerification(
    @Param('id') id: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    const verification = await this.repository.findById(id);
    if (!verification) {
      throw new NotFoundException(`Verification ${id} not found`);
    }

    await this.repository.updateStatus(id, dto.status, {
      reviewedBy: 'admin', // In a real app, this comes from the JWT User
      reviewReason: dto.reason,
      reviewedAt: new Date().toISOString(),
    });

    return { success: true, status: dto.status };
  }
}
