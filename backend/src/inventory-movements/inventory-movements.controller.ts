// src/inventory-movements/inventory-movements.controller.ts
import { Body, Controller, Get, Param, Post, Req, SetMetadata, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from 'src/AuthModule/jwt-auth.guard'
import { RoleGuard } from 'src/guards/role.guard'
import { CreateMovementDto } from './dto/create-movement.dto'
import { ReserveDto } from './dto/reserve.dto'; // Создадим этот DTO ниже
import { InventoryMovementsService } from './inventory-movements.service'

@Controller('inventory-movements')
@UseGuards(JwtAuthGuard, RoleGuard)
export class InventoryMovementsController {
  constructor(private readonly service: InventoryMovementsService) {}

  @Post()
  @SetMetadata('roles', Role.WAREHOUSE_WORKER)
  create(@Body() createMovementDto: CreateMovementDto, @Req() req) {
    const userId = req.user.id;
    console.log(userId);
    return this.service.createMovement(createMovementDto, userId);
  }

  @Post('reserve')
  @SetMetadata('roles', Role.WAREHOUSE_WORKER)
  reserve(@Body() reserveDto: ReserveDto, @Req() req) {
    const userId = req.user.id;
    return this.service.reserveForOrder(reserveDto, userId);
  }

  @Get('batch/:batchId')
  @SetMetadata('roles', Role.WAREHOUSE_WORKER)
  findByBatch(@Param('batchId') batchId: string) {
    return this.service.findByBatch(batchId);
  }
}
