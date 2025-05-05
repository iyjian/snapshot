import { Controller, Get, Render } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
export class AppController {
  constructor() {}

  @SkipThrottle()
  @Get()
  @Render('index')
  index() {
    return;
  }
}
