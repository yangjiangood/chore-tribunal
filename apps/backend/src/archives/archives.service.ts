import { Injectable } from '@nestjs/common';

@Injectable()
export class ArchivesService {
  getModuleInfo() {
    return {
      module: 'archives',
      status: 'ready-for-implementation',
    };
  }
}
