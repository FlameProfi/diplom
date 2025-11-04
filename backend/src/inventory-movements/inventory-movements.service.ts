// src/inventory-movements/inventory-movements.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { MovementType, Prisma } from '@prisma/client'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import { ReserveDto } from './dto/reserve.dto'

@Injectable()
export class InventoryMovementsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createMovement(
    createMovementDto: {
      batchId: string;
      type: MovementType;
      quantity: number;
      toWarehouseId?: string;
      fromWarehouseId?: string;
      reason?: string;
    },
    userId: string,
  ) {
    // Валидация входных данных
    if (!createMovementDto.batchId) {
      throw new BadRequestException('batchId обязателен для создания движения');
    }
    if (!createMovementDto.type || !['RECEIPT', 'ISSUE', 'RESERVE'].includes(createMovementDto.type)) {
      throw new BadRequestException('Неверный тип движения. Доступно: RECEIPT, ISSUE, RESERVE');
    }
    if (createMovementDto.quantity <= 0) {
      throw new BadRequestException('Количество должно быть больше 0');
    }

    console.log('createMovement input:', createMovementDto);
    console.log('User ID:', userId);

    // Найти партию с правильными include
    const batch = await this.prisma.batch.findUnique({
      where: { 
        id: createMovementDto.batchId 
      },
      include: { 
        stockItems: {
          include: {
            warehouse: true
          }
        },
        productType: true
      },
    });

    if (!batch) {
      throw new NotFoundException(`Партия с ID ${createMovementDto.batchId} не найдена`);
    }

    console.log('Batch found:', { 
      id: batch.id, 
      batchNumber: batch.batchNumber, 
      productType: batch.productType?.name,
      quantity: batch.quantity 
    });

    // Найти склад по умолчанию
    const defaultWarehouse = await this.prisma.warehouse.findFirst({ 
      where: { type: 'MAIN' } 
    });
    
    if (!defaultWarehouse && !createMovementDto.toWarehouseId) {
      throw new NotFoundException('Склад не найден — запустите seed-скрипт для создания MAIN warehouse');
    }

    const warehouseId = createMovementDto.toWarehouseId || defaultWarehouse?.id;

    if (!warehouseId) {
      throw new BadRequestException('Требуется указать склад (toWarehouseId) или создать MAIN warehouse');
    }

    // Создать движение инвентаря
    const movement = await this.prisma.inventoryMovement.create({
      data: {
        batchId: createMovementDto.batchId,
        type: createMovementDto.type,
        quantity: createMovementDto.quantity,
        date: new Date(),
        reason: createMovementDto.reason || `Движение партия ${createMovementDto.batchId}`,
        userId: userId,
        toWarehouseId: warehouseId,
        fromWarehouseId: createMovementDto.fromWarehouseId,
      },
      include: { 
        batch: { 
          include: { 
            productType: true 
          } 
        }, 
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true 
          } 
        },
        toWarehouse: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    });

    console.log('Movement created:', movement.id);

    // Найти или создать StockItem
    let stockItem = await this.prisma.stockItem.findUnique({
      where: { 
        batchId_warehouseId: { 
          batchId: createMovementDto.batchId, 
          warehouseId 
        } 
      },
      include: {
        warehouse: true
      }
    });

    if (!stockItem) {
      stockItem = await this.prisma.stockItem.create({
        data: {
          batchId: createMovementDto.batchId,
          warehouseId,
          quantity: 0,
          reserved: 0,
        },
        include: {
          warehouse: true
        }
      });
      console.log('StockItem created:', stockItem.id);
    }

    // Рассчитать изменение количества
    const delta = createMovementDto.type === 'RECEIPT' 
      ? createMovementDto.quantity 
      : -createMovementDto.quantity;

    const newQuantity = (stockItem.quantity || 0) + delta;

    // Проверка остатков для списания
    if (createMovementDto.type === 'ISSUE' && newQuantity < 0) {
      throw new BadRequestException(
        `Недостаточно остатков для списания. Доступно: ${stockItem.quantity || 0}, требуется: ${createMovementDto.quantity}. Склад: ${stockItem.warehouse?.name}`
      );
    }

    // Обновить StockItem
    const updatedStockItem = await this.prisma.stockItem.update({
      where: { 
        id: stockItem.id 
      },
      data: { 
        quantity: newQuantity 
      },
      include: {
        warehouse: true
      }
    });

    console.log('StockItem updated:', { 
      stockItemId: updatedStockItem.id, 
      newQuantity: updatedStockItem.quantity,
      warehouse: updatedStockItem.warehouse?.name 
    });

    // Обновить общее количество в партии
    const totalQuantity = await this.prisma.stockItem.aggregate({
      where: { batchId: createMovementDto.batchId },
      _sum: { quantity: true },
    });

    const updatedBatch = await this.prisma.batch.update({
      where: { id: createMovementDto.batchId },
      data: { 
        quantity: totalQuantity._sum?.quantity ?? 0,
      },
      include: {
        productType: true
      }
    });

    console.log('Batch quantity updated:', { 
      batchId: createMovementDto.batchId,
      totalQuantity: totalQuantity._sum?.quantity ?? 0,
      productType: updatedBatch.productType?.name 
    });

    // Уведомление о низком остатке
    try {
      if (typeof this.notificationsService.checkLowStock === 'function') {
        await this.notificationsService.checkLowStock(createMovementDto.batchId);
        console.log('Low stock notification checked');
      }
    } catch (error) {
      console.warn('Не удалось проверить уведомление о низком остатке:', error.message);
    }

    return {
      success: true,
      movement: {
        id: movement.id,
        type: movement.type,
        quantity: movement.quantity,
        date: movement.date,
        reason: movement.reason,
        batchNumber: movement.batch.batchNumber,
        productType: movement.batch.productType?.name || 'Неизвестный тип',
        warehouse: movement.toWarehouse?.name || 'Не указан',
        user: movement.user.name || movement.user.email,
      },
      stockItem: {
        id: updatedStockItem.id,
        quantity: updatedStockItem.quantity,
        reserved: updatedStockItem.reserved || 0,
        warehouse: updatedStockItem.warehouse?.name || 'Неизвестный склад',
        batchId: updatedStockItem.batchId,
      },
      batch: {
        id: updatedBatch.id,
        batchNumber: updatedBatch.batchNumber,
        productType: updatedBatch.productType?.name || 'Неизвестный тип',
        totalQuantity: totalQuantity._sum?.quantity ?? 0,
        status: updatedBatch.status || 'ACTIVE',
      },
    };
  }

  async reserveForOrder(dto: ReserveDto, userId: string) {
    const { batchId, orderItemId, quantity } = dto;

    // Валидация
    if (!batchId || !orderItemId || quantity <= 0) {
      throw new BadRequestException('batchId, orderItemId и quantity обязательны и должны быть больше 0');
    }

    console.log('reserveForOrder input:', { batchId, orderItemId, quantity, userId });

    // Найти партию с productType
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { 
        stockItems: {
          include: {
            warehouse: true
          }
        },
        productType: true
      },
    });

    if (!batch) {
      throw new NotFoundException(`Партия с ID ${batchId} не найдена`);
    }

    // Проверить остатки для резерва
    const stockItems = batch.stockItems || [];
    const totalQuantity = stockItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalReserved = stockItems.reduce((sum, item) => sum + (item.reserved || 0), 0);
    const availableForReserve = totalQuantity - totalReserved;

    if (availableForReserve < quantity) {
      throw new BadRequestException(
        `Недостаточно свободных остатков для резерва.\n` +
        `Общий остаток: ${totalQuantity}\n` +
        `Зарезервировано: ${totalReserved}\n` +
        `Доступно: ${availableForReserve}\n` +
        `Требуется: ${quantity}\n` +
        `Партия: ${batch.batchNumber} (${batch.productType?.name})`
      );
    }

    // Создать движение резерва
    const movement = await this.prisma.inventoryMovement.create({
      data: {
        batchId,
        type: 'RESERVE',
        quantity,
        date: new Date(),
        reason: `Резерв под позицию заказа ${orderItemId}`,
        userId,
      },
      include: { 
        batch: { 
          include: { 
            productType: true 
          } 
        }, 
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true 
          } 
        } 
      },
    });

    console.log('Reserve movement created:', movement.id);

    // Распределить резерв по складам
    if (stockItems.length > 0) {
      const totalAvailable = stockItems.reduce((sum, item) => {
        const available = (item.quantity || 0) - (item.reserved || 0);
        return sum + Math.max(0, available);
      }, 0);

      await Promise.all(
        stockItems.map(async (item) => {
          const available = (item.quantity || 0) - (item.reserved || 0);
          if (available > 0 && totalAvailable > 0) {
            const reservePortion = (available / totalAvailable) * quantity;
            const actualReserve = Math.min(reservePortion, available);
            
            await this.prisma.stockItem.update({
              where: { id: item.id },
              data: { 
                reserved: { 
                  increment: actualReserve 
                } 
              },
            });

            console.log(`Reserved ${actualReserve.toFixed(2)} for stockItem ${item.id} on warehouse ${item.warehouse?.name}`);
          }
        })
      );
    }

    // Обновить batch
    const totalQuantityAfterReserve = await this.prisma.stockItem.aggregate({
      where: { batchId },
      _sum: { 
        quantity: true,
        reserved: true
      },
    });

    const updatedBatch = await this.prisma.batch.update({
      where: { id: batchId },
      data: { 
        quantity: totalQuantityAfterReserve._sum?.quantity ?? 0,
      },
      include: {
        productType: true
      }
    });

    return {
      success: true,
      movement: {
        id: movement.id,
        type: movement.type,
        quantity: movement.quantity,
        date: movement.date,
        reason: movement.reason,
        batchNumber: movement.batch.batchNumber,
        productType: movement.batch.productType?.name || 'Неизвестный тип',
        user: movement.user.name || movement.user.email,
      },
      stockInfo: {
        totalQuantity: totalQuantityAfterReserve._sum?.quantity ?? 0,
        totalReserved: totalQuantityAfterReserve._sum?.reserved ?? 0,
        availableForReserve,
        reservedThisTime: quantity,
      },
      batch: {
        id: updatedBatch.id,
        batchNumber: updatedBatch.batchNumber,
        productType: updatedBatch.productType?.name || 'Неизвестный тип',
        totalQuantity: totalQuantityAfterReserve._sum?.quantity ?? 0,
      },
    };
  }

  async findByBatch(batchId: string) {
    if (!batchId) {
      throw new BadRequestException('batchId обязателен');
    }

    // Проверка существования партии
    const batchExists = await this.prisma.batch.findUnique({ 
      where: { id: batchId },
      include: {
        productType: true
      }
    });
    
    if (!batchExists) {
      throw new NotFoundException(`Партия с ID ${batchId} не найдена`);
    }

    const movements = await this.prisma.inventoryMovement.findMany({
      where: { batchId },
      orderBy: { date: 'desc' },
      take: 50,
      include: { 
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true 
          } 
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
          }
        },
        toWarehouse: {
          select: {
            name: true
          }
        }
      },
    });

    // Добавить информацию о типе продукта
    const movementsWithProductType = movements.map(movement => ({
      ...movement,
      productType: batchExists.productType?.name || 'Неизвестный тип',
    }));

    return {
      movements: movementsWithProductType,
      batchInfo: {
        id: batchExists.id,
        batchNumber: batchExists.batchNumber,
        productType: batchExists.productType?.name || 'Неизвестный тип',
      },
      totalMovements: movements.length,
    };
  }

  // Получить статистику по движениям
  async getMovementStats(batchId?: string, dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    
    if (batchId) where.batchId = batchId;
    if (dateFrom) where.date = { gte: dateFrom };
    if (dateTo) where.date = { ...where.date, lte: dateTo };

    const movements = await this.prisma.inventoryMovement.findMany({
      where,
      include: { 
        batch: { 
          include: { 
            productType: true 
          } 
        },
        toWarehouse: true,
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: { date: 'desc' },
    });

    // Статистика по типам движений
    const stats = movements.reduce((acc, movement) => {
      const type = movement.type;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalQuantity: 0,
          lastDate: new Date(),
          productType: movement.batch.productType.name,
        };
      }
      acc[type].count++;
      acc[type].totalQuantity += movement.quantity;
      if (new Date(movement.date) > acc[type].lastDate) {
        acc[type].lastDate = new Date(movement.date);
      }
      return acc;
    }, {} as any);

    return {
      movements,
      stats,
      totalMovements: movements.length,
      dateRange: dateFrom && dateTo 
        ? `${dateFrom.toISOString().split('T')[0]} - ${dateTo.toISOString().split('T')[0]}`
        : 'Все время',
      summary: {
        totalQuantity: movements.reduce((sum, m) => sum + m.quantity, 0),
        uniqueBatches: [...new Set(movements.map(m => m.batchId))].length,
        uniqueWarehouses: [...new Set(movements.map(m => m.toWarehouseId))].length,
      }
    };
  }

  // ИСПРАВЛЕННЫЙ метод updateStockItemsBulk с правильной типизацией
  async updateStockItemsBulk(updates: Array<{
    batchId: string;
    warehouseId: string;
    quantity: number;
    type: MovementType;
  }>): Promise<Prisma.StockItemGetPayload<{ include: { warehouse: true } }>[]> {
    
    if (!updates || updates.length === 0) {
      throw new BadRequestException('Массив updates не может быть пустым');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Явно типизируем results массив
      const results: Prisma.StockItemGetPayload<{ include: { warehouse: true } }>[] = [];

      for (const update of updates) {
        // Валидация входных данных
        if (!update.batchId || !update.warehouseId || update.quantity <= 0) {
          throw new BadRequestException('Каждый элемент updates должен содержать batchId, warehouseId и quantity > 0');
        }

        if (!['RECEIPT', 'ISSUE', 'RESERVE'].includes(update.type)) {
          throw new BadRequestException(`Неверный тип движения: ${update.type}`);
        }

        // Проверяем существование партии
        const batchExists = await tx.batch.findUnique({ 
          where: { id: update.batchId } 
        });
        if (!batchExists) {
          throw new NotFoundException(`Партия с ID ${update.batchId} не найдена`);
        }

        // Проверяем существование склада
        const warehouseExists = await tx.warehouse.findUnique({ 
          where: { id: update.warehouseId } 
        });
        if (!warehouseExists) {
          throw new NotFoundException(`Склад с ID ${update.warehouseId} не найден`);
        }

        // Проверяем текущие остатки для ISSUE
        if (update.type === 'ISSUE') {
          const currentStock = await tx.stockItem.findUnique({
            where: { 
              batchId_warehouseId: { 
                batchId: update.batchId, 
                warehouseId: update.warehouseId 
              } 
            },
          });

          const available = currentStock?.quantity || 0;
          if (available < update.quantity) {
            throw new BadRequestException(
              `Недостаточно остатков на складе ${warehouseExists.name}. Доступно: ${available}, требуется: ${update.quantity}`
            );
          }
        }

        // Выполняем upsert с include для полного объекта
        const stockItem = await tx.stockItem.upsert({
          where: { 
            batchId_warehouseId: { 
              batchId: update.batchId, 
              warehouseId: update.warehouseId 
            } 
          },
          update: { 
            quantity: { 
              increment: update.type === 'RECEIPT' ? update.quantity : -update.quantity 
            },
            reserved: update.type === 'RESERVE' ? { 
              increment: update.quantity 
            } : undefined,
          },
          create: {
            batchId: update.batchId,
            warehouseId: update.warehouseId,
            quantity: update.type === 'RECEIPT' ? update.quantity : 0,
            reserved: update.type === 'RESERVE' ? update.quantity : 0,
          },
          include: {
            warehouse: true // Добавляем include для полной информации
          }
        });

        // Теперь push работает — stockItem имеет правильный тип
        results.push(stockItem);

        console.log(`Updated stockItem ${stockItem.id}: quantity=${stockItem.quantity}, warehouse=${stockItem.warehouse?.name}`);

        // Обновляем batch quantity
        const totalQuantity = await tx.stockItem.aggregate({
          where: { batchId: update.batchId },
          _sum: { quantity: true },
        });

        await tx.batch.update({
          where: { id: update.batchId },
          data: { 
            quantity: totalQuantity._sum?.quantity ?? 0,
          },
        });

        console.log(`Updated batch ${update.batchId}: totalQuantity=${totalQuantity._sum?.quantity ?? 0}`);
      }

      return results; // Возвращаем типизированный массив
    });
  }

  // // Вспомогательный метод для создания уведомления
  // private async createStockNotification(
  //   batchId: string, 
  //   type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'RESTOCKED', 
  //   userId: string
  // ) {
  //   try {
  //     const batch = await this.prisma.batch.findUnique({
  //       where: { id: batchId },
  //       include: { 
  //         productType: true,
  //         stockItems: {
  //           include: {
  //             warehouse: true
  //           }
  //         }
  //       }
  //     });

  //     if (batch && batch.productType) {
  //       const totalQuantity = batch.stockItems?.reduce((sum, item) => 
  //         sum + (item.quantity || 0), 0) || 0;

  //       if (typeof this.notificationsService.create === 'function') {
  //         await this.notificationsService.create({
  //           userId,
  //           title: `${type === 'LOW_STOCK' ? 'Низкий остаток' : 
  //                  type === 'OUT_OF_STOCK' ? 'Товар закончился' : 'Поступление товара'}`,
  //           message: `${batch.productType.name} (${batch.batchNumber}) - остаток: ${totalQuantity} ${batch.productType.unit || 'ед.'}`,
  //           type,
  //           relatedBatchId: batchId,
  //           priority: type === 'OUT_OF_STOCK' ? 'HIGH' : 'MEDIUM',
  //         });
  //       }
  //     }
  //   } catch (error) {
  //     console.warn('Ошибка создания уведомления:', error.message);
  //   }
  // }

  // Дополнительный метод для проверки низкого остатка
  // async checkLowStock(batchId: string) {
  //   const batch = await this.prisma.batch.findUnique({
  //     where: { id: batchId },
  //     include: { 
  //       productType: true,
  //       stockItems: {
  //         include: {
  //           warehouse: true
  //         }
  //       }
  //     }
  //   });

  //   if (!batch) {
  //     return false;
  //   }

  //   const totalQuantity = batch.stockItems?.reduce((sum, item) => 
  //     sum + (item.quantity || 0), 0) || 0;

  //   const minStock = batch.stockItems?.reduce((min, item) => {
  //     const itemMin = item.warehouse?.minStock || 10; // Default minimum
  //     return Math.min(min, itemMin);
  //   }, Infinity) || 10;

  //   const isLowStock = totalQuantity <= minStock;

  //   if (isLowStock) {
  //     // Создаем уведомление для всех пользователей с ролью WAREHOUSE_WORKER
  //     // Здесь нужно получить userId из контекста или создать системное уведомление
  //     const adminUserId = 'system-admin'; // Замените на реальный ID или получите из конфига
      
  //     await this.createStockNotification(
  //       batchId, 
  //       totalQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK', 
  //       adminUserId
  //     );
  //   }

  //   return {
  //     batchId,
  //     totalQuantity,
  //     minStock,
  //     isLowStock,
  //     productType: batch.productType?.name,
  //     batchNumber: batch.batchNumber,
  //   };
  // }
}
