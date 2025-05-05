import { Module } from '@nestjs/common';
import { SnapshotService } from './snapshot.service';
import { SnapshotController } from './snapshot.controller';
import { BrowserAutomation } from './automate.service';
@Module({
  providers: [SnapshotService, BrowserAutomation],
  controllers: [SnapshotController],
})
export class SnapshotModule {}
