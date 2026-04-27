import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { successResponse } from '../common/http/api-response';
import type { RequestAuth } from '../common/auth/request-auth.interface';
import { GenerateVerdictDto } from './dto/generate-verdict.dto';
import { LatestVerdictQueryDto } from './dto/latest-verdict.query';
import { VerdictsService } from './verdicts.service';

@Controller('verdicts')
export class VerdictsController {
  constructor(private readonly verdictsService: VerdictsService) {}

  private writeStreamEvent(
    response: Response,
    event: string,
    payload: unknown,
  ) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(payload)}\n\n`);

    const flushable = response as Response & {
      flush?: () => void;
    };
    flushable.flush?.();
  }

  @Get('_meta')
  getModuleInfo() {
    return successResponse(this.verdictsService.getModuleInfo());
  }

  @Post('generate')
  @UseGuards(AccessTokenGuard)
  async generateVerdict(
    @CurrentAuth() auth: RequestAuth,
    @Body() dto: GenerateVerdictDto,
  ) {
    return successResponse(
      await this.verdictsService.generateVerdict(auth.familyId, dto),
    );
  }

  @Post('generate/stream')
  @UseGuards(AccessTokenGuard)
  async streamGenerateVerdict(
    @CurrentAuth() auth: RequestAuth,
    @Body() dto: GenerateVerdictDto,
    @Res() response: Response,
  ) {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');

    const flushable = response as Response & {
      flushHeaders?: () => void;
    };
    flushable.flushHeaders?.();

    try {
      const verdict = await this.verdictsService.streamGenerateVerdict(
        auth.familyId,
        dto,
        {
          onMeta: (payload) => {
            this.writeStreamEvent(response, 'meta', payload);
          },
          onDelta: (payload) => {
            this.writeStreamEvent(response, 'delta', payload);
          },
          onReplace: (payload) => {
            this.writeStreamEvent(response, 'replace', payload);
          },
        },
      );

      this.writeStreamEvent(response, 'complete', {
        verdict,
      });
    } catch (error) {
      this.writeStreamEvent(response, 'error', {
        code: 'VERDICT_STREAM_FAILED',
        message:
          error instanceof Error ? error.message : 'Verdict stream failed',
      });
    } finally {
      response.end();
    }
  }

  @Get('latest')
  @UseGuards(AccessTokenGuard)
  async getLatestVerdict(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: LatestVerdictQueryDto,
  ) {
    return successResponse(
      await this.verdictsService.getLatestVerdict(auth.familyId, query.weekId),
    );
  }
}
