import {
  Controller,
  Get,
  Header,
  MessageEvent,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { successResponse } from '../common/http/api-response';
import type { RequestAuth } from '../common/auth/request-auth.interface';
import { RealtimeService } from './realtime.service';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get('_meta')
  getModuleInfo() {
    return successResponse(this.realtimeService.getModuleInfo());
  }

  @Sse('board/stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @UseGuards(AccessTokenGuard)
  streamBoard(@CurrentAuth() auth: RequestAuth): Observable<MessageEvent> {
    return this.realtimeService.streamBoard(auth.familyId);
  }
}
