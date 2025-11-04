import { Module } from '@nestjs/common'
import { PrismaModule } from 'src/prisma/prisma.module'
import { CustomersController } from './customers.controller'
import { CustomersService } from './customers.service'

@Module({
  imports: [PrismaModule],
  providers: [CustomersService],
  controllers: [CustomersController]
})
export class CustomersModule {}
