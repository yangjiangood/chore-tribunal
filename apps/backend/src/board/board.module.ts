import { Global, Module } from '@nestjs/common';
import { BoardService } from './board.service';

@Global()
@Module({
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
