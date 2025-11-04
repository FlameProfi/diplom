import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { region?: string; country?: string }) {
    const where = {};
    if (params.region) where['region'] = { contains: params.region, mode: 'insensitive' };
    if (params.country) where['country'] = { contains: params.country, mode: 'insensitive' };

    return this.prisma.customer.findMany({
      where,
      include: {
        user: true,  // Связь с User для кабинета
        orders: { include: { orderItems: true } },  // Заказы клиента
        contracts: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(createCustomerDto: {
    name: string;
    email?: string;
    phone?: string;
    region?: string;
    country?: string;
    address?: string;
    taxId?: string;
    userId?: string;  // Опционально, связь с User
  }) {
    return this.prisma.customer.create({
      data: createCustomerDto,
      include: {
        user: true,
        orders: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
        orders: { include: { orderItems: { include: { batch: true } } } },
        contracts: true,
        invoices: true,
      },
    });
  }

  async update(id: string, updateCustomerDto: any) {
    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
      include: { user: true, orders: true },
    });
  }
}