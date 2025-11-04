import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './AuthModule/auth.module'
import { BatchesModule } from './batches/batches.module'
import { CustomersModule } from './customers/customers.module'
import { InventoryMovementsModule } from './inventory-movements/inventory-movements.module'
import { NotificationsModule } from './notifications/notifications.module'
import { OrdersModule } from './orders/orders.module'
import { PrismaModule } from './prisma/prisma.module'
import { StockModule } from './stock/stock.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BatchesModule,
    PrismaModule,
    InventoryMovementsModule,
    OrdersModule,
    CustomersModule,
    NotificationsModule,
    StockModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
