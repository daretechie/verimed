import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ManualReviewService } from '../services/manual-review.service';

class ReviewDecisionDto {
  reviewerId!: string;
  notes?: string;
  reason?: string;
}

@ApiTags('Manual Review (HITL)')
@ApiSecurity('api-key')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'reviews', version: '1' })
export class ManualReviewController {
  constructor(private readonly reviewService: ManualReviewService) {}

  @Get()
  @ApiOperation({ summary: 'Get all pending manual reviews' })
  @ApiResponse({ status: 200, description: 'List of pending reviews' })
  async getPendingReviews() {
    const reviews = await this.reviewService.getPendingReviews();
    const count = await this.reviewService.getPendingCount();
    return { count, reviews };
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve a pending review' })
  @ApiResponse({ status: 200, description: 'Review approved' })
  async approve(@Param('id') id: string, @Body() dto: ReviewDecisionDto) {
    return this.reviewService.approveReview(id, dto.reviewerId, dto.notes);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject a pending review' })
  @ApiResponse({ status: 200, description: 'Review rejected' })
  async reject(@Param('id') id: string, @Body() dto: ReviewDecisionDto) {
    if (!dto.reason) {
      throw new Error('Rejection reason is mandatory');
    }
    return this.reviewService.rejectReview(id, dto.reviewerId, dto.reason);
  }

  @Post(':id/escalate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Escalate a review to senior verifier' })
  @ApiResponse({ status: 200, description: 'Review escalated' })
  async escalate(@Param('id') id: string, @Body() dto: ReviewDecisionDto) {
    if (!dto.reason) {
      throw new Error('Escalation reason is mandatory');
    }
    return this.reviewService.escalateReview(id, dto.reviewerId, dto.reason);
  }
}
