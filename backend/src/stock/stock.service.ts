import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.stockItem.findMany({
      include: { batch: true, warehouse: true },
      orderBy: { quantity: 'desc' },
    });
  }

  async findByBatch(batchId: string) {
    return this.prisma.stockItem.findMany({
      where: { batchId },
      include: { batch: true, warehouse: true },
    });
  }
}