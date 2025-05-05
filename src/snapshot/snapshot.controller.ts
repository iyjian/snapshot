import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CaptureTrafficOptionDto } from './dto/snapshot.request.dto';
import { SnapshotService } from './snapshot.service';

@Controller('snapshot')
export class SnapshotController {
  constructor(private readonly snapshotService: SnapshotService) {}

  @Get('dryrun')
  dryrun() {
    return this.snapshotService.dryRun();
  }

  @Post('')
  captureTraffic(@Body() options: CaptureTrafficOptionDto) {
    return this.snapshotService.captureTraffic(options);
  }
}
