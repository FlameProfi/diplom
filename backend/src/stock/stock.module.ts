import { Module } from '@nestjs/common'
import { PrismaModule } from 'src/prisma/prisma.module'
import { StockController } from './stock.controller'
import { StockService } from './stock.service'

@Module({
  imports: [PrismaModule],
  providers: [StockService],
  controllers: [StockController]
})
export class StockModule {}
