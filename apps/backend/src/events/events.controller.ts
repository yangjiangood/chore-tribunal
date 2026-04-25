import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { successResponse } from '../common/http/api-response';
import type { RequestAuth } from '../common/auth/request-auth.interface';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventsQueryDto } from './dto/list-events.query';
import { RevertEventDto } from './dto/revert-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('_meta')
  getModuleInfo() {
    return successResponse(this.eventsService.getModuleInfo());
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  async listEvents(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListEventsQueryDto,
  ) {
    return successResponse(
      await this.eventsService.listEvents(auth.familyId, query),
    );
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  async createEvent(
    @CurrentAuth() auth: RequestAuth,
    @Body() dto: CreateEventDto,
  ) {
    return successResponse(
      await this.eventsService.createEvent(auth.familyId, dto),
    );
  }

  @Post(':eventId/revert')
  @UseGuards(AccessTokenGuard)
  async revertEvent(
    @CurrentAuth() auth: RequestAuth,
    @Param('eventId') eventId: string,
    @Body() dto: RevertEventDto,
  ) {
    return successResponse(
      await this.eventsService.revertEvent(auth.familyId, eventId, dto),
    );
  }
}
