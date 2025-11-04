import { Module } from '@nestjs/common'
import { PrismaModule } from 'src/prisma/prisma.module'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [PrismaModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService]
})
export class NotificationsModule {}
