import { Controller, Get, Param } from '@nestjs/common'
import { NotificationsService } from './notifications.service'

@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.service.findAll(userId);
  }
}