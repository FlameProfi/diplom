import { Injectable } from '@nestjs/common'
import { NotificationType } from '@prisma/client'; // Enum
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async checkLowStock(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { 
        productType: true, 
        stockItems: { include: { warehouse: true } },
      },
    });

    if (!batch) return;

    const totalStock = await this.prisma.stockItem.aggregate({
      where: { batchId },
      _sum: { quantity: true },
    });

    const minStock = batch.minStock || 10;

    if ((totalStock._sum.quantity ?? 0) < minStock) {
      await this.prisma.notification.create({
        data: {
          userId: 'warehouse-worker-id',
          type: 'LOW_STOCK' as NotificationType,
          message: `Критический остаток партии ${batch.batchNumber}: ${(totalStock._sum.quantity ?? 0)} ${batch.unit}`,
          relatedId: batchId,
        },
      });
    }
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}