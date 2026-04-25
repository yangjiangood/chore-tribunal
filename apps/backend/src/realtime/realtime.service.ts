import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, concat, defer } from 'rxjs';
import { BoardService } from '../board/board.service';

@Injectable()
export class RealtimeService {
  private readonly familyStreams = new Map<string, Subject<MessageEvent>>();

  constructor(private readonly boardService: BoardService) {}

  getModuleInfo() {
    return {
      module: 'realtime',
      status: 'sse-board-stream-implemented',
    };
  }

  streamBoard(familyId: string): Observable<MessageEvent> {
    return concat(
      defer(async () => {
        const snapshot =
          await this.boardService.getCurrentBoardSnapshot(familyId);

        return {
          data: {
            type: 'board.snapshot',
            payload: snapshot,
          },
        } satisfies MessageEvent;
      }),
      this.ensureFamilyStream(familyId).asObservable(),
    );
  }

  async publishEventCreated(
    familyId: string,
    payload: { eventId: string; memberId: string; status: string },
  ) {
    this.publish(familyId, 'event.created', payload);
    await this.publishBoardSnapshot(familyId);
  }

  async publishEventReverted(
    familyId: string,
    payload: { eventId: string; status: string },
  ) {
    this.publish(familyId, 'event.reverted', payload);
    await this.publishBoardSnapshot(familyId);
  }

  publishVerdictGenerated(
    familyId: string,
    payload: {
      verdictId: string;
      weekId: string;
      status: string;
      source: string;
      generatedAt: Date;
    },
  ) {
    this.publish(familyId, 'verdict.generated', payload);
  }

  private async publishBoardSnapshot(familyId: string) {
    const snapshot = await this.boardService.getCurrentBoardSnapshot(familyId);
    this.publish(familyId, 'board.snapshot', snapshot);
  }

  private publish(familyId: string, type: string, payload: unknown) {
    this.ensureFamilyStream(familyId).next({
      data: {
        type,
        payload,
      },
    });
  }

  private ensureFamilyStream(familyId: string) {
    let stream = this.familyStreams.get(familyId);

    if (!stream) {
      stream = new Subject<MessageEvent>();
      this.familyStreams.set(familyId, stream);
    }

    return stream;
  }
}
