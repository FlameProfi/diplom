import { Module } from '@nestjs/common'
import { PrismaModule } from 'src/prisma/prisma.module'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  imports: [PrismaModule],
  providers: [OrdersService],
  controllers: [OrdersController]
})
export class OrdersModule {}
