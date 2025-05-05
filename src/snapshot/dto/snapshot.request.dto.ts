import { Action } from './automate.request.dto';

export interface CaptureTrafficOptionDto {
  trafficFilter?: { include: string[] };
  device?: string;
  resolution?: string;
  debug?: boolean;
  proxy?: string;
  preActions?: Action[];
  outputActions?: Action[];
}
