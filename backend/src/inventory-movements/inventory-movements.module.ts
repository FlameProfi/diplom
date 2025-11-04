import { Module } from '@nestjs/common'
import { NotificationsModule } from 'src/notifications/notifications.module'
import { PrismaModule } from 'src/prisma/prisma.module'
import { InventoryMovementsController } from './inventory-movements.controller'
import { InventoryMovementsService } from './inventory-movements.service'

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [InventoryMovementsService],
  controllers: [InventoryMovementsController]
})
export class InventoryMovementsModule {}
