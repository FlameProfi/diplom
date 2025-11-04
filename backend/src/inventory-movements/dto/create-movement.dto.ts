// src/inventory-movements/dto/create-movement.dto.ts
import { MovementType } from '@prisma/client'
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator'

export class CreateMovementDto {
  @IsNotEmpty()
  @IsOptional() // Временно, если batchId приходит как barcode, но лучше сделать required
  batchId: string;

  @IsNotEmpty()
  @IsEnum(MovementType)
  type: MovementType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  toWarehouseId?: string;

  @IsOptional()
  fromWarehouseId?: string;

  @IsOptional()
  reason?: string;
}
