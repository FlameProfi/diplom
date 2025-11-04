import { Body, Controller, Get, Param, Patch, Post, SetMetadata, UseGuards, ValidationPipe } from '@nestjs/common'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from 'src/AuthModule/jwt-auth.guard'
import { RoleGuard } from 'src/guards/role.guard'
import { OrdersService } from './orders.service'
interface CreateOrderDto {
  orderNumber: string;
  customerId: string;
  status?: 'NEW';
  totalAmount?: number | string;
  expectedDelivery?: string | Date;
  orderItems: { batchId: string; quantity: number; price?: number | string }[];
}

@Controller('orders')
@UseGuards(JwtAuthGuard, RoleGuard)

export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @SetMetadata('roles', Role.CLIENT)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @SetMetadata('roles', Role.MANAGER)
  create(@Body(ValidationPipe) createOrderDto: CreateOrderDto) {  // Use pipe for basic validation/parsing
    return this.service.create(createOrderDto);
  }

  @Patch(':id/status/:status')
  updateStatus(@Param('id') id: string, @Param('status') status: string) {
    // Simple type guard for status (expand as needed)
    const validStatuses = ['NEW', 'IN_PRODUCTION', 'PACKED', 'READY_FOR_SHIPMENT', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
    if (!validStatuses.includes(status as any)) {
      throw new Error('Invalid status');
    }
    return this.service.updateStatus(id, status as any);
  }
}