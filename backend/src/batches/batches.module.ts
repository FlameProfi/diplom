import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { BatchesController } from './batches.controller'
import { BatchesService } from './batches.service'

@Module({
  imports: [PrismaModule],
  providers: [BatchesService],
  controllers: [BatchesController],
})
export class BatchesModule {}
