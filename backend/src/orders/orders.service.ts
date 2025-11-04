import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        customer: true,
        orderItems: { include: { batch: true } },
        shipments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(createOrderDto: {
    orderNumber: string;
    customerId: string;
    status?: 'NEW';
    totalAmount?: number | string;  // Allow string for parsing
    expectedDelivery?: string | Date;  // Allow string for parsing
    orderItems: { batchId: string; quantity: number; price?: number | string }[];  // Allow string for price
  }) {
    // Parse optional fields to ensure correct types
    const totalAmount = createOrderDto.totalAmount ? Number(createOrderDto.totalAmount) : undefined;
    const expectedDelivery = createOrderDto.expectedDelivery ? new Date(createOrderDto.expectedDelivery) : undefined;
    
    // Validate parsed date (optional, but good practice)
    if (expectedDelivery && isNaN(expectedDelivery.getTime())) {
      throw new NotFoundException('Invalid expectedDelivery date format. Use YYYY-MM-DD.');
    }

    const order = await this.prisma.order.create({
      data: {
        orderNumber: createOrderDto.orderNumber,
        customerId: createOrderDto.customerId,
        status: createOrderDto.status || 'NEW',
        totalAmount,
        expectedDelivery,
        orderItems: {
          create: createOrderDto.orderItems.map(item => ({
            batchId: item.batchId,
            quantity: item.quantity,
            price: item.price ? Number(item.price) : undefined,
          })),
        },
      },
      include: {
        customer: true,
        orderItems: { include: { batch: true } },
      },
    });

    // Update reserved in StockItem for ISSUE (reserve for order)
    for (const item of createOrderDto.orderItems) {
      await this.prisma.stockItem.updateMany({
        where: { batchId: item.batchId },
        data: { reserved: { increment: item.quantity } },
      });
    }

    return order;
  }

  async findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        orderItems: { include: { batch: true } },
        shipments: true,
      },
    });
  }

  async updateStatus(
    id: string, 
    status: 'NEW' | 'IN_PRODUCTION' | 'PACKED' | 'READY_FOR_SHIPMENT' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Заказ не найден');

    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { customer: true, orderItems: true },
    });
  }
}