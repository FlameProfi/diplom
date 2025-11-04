import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { BatchStatus } from '@prisma/client'
import { createCanvas } from 'canvas'
import JsBarcode from 'jsbarcode'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.batch.findMany({
      include: { productType: true },
    });
  }

  async findOne(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        productType: true,
        stockItems: { include: { warehouse: true } },
        movements: { include: { user: true, toWarehouse: true } },
        documents: true,
      },
    });
    if (!batch) throw new NotFoundException(`Batch with ID ${id} not found`);
    return batch;
  }

  async create(createBatchDto: any) {
    const barcode = this.generateBarcode();
    const batch = await this.prisma.batch.create({
      data: { ...createBatchDto, barcode },
    });

    const canvas = createCanvas(200, 100);
    JsBarcode(canvas, barcode, { format: 'code128' });
    const barcodeImage = canvas.toBuffer();

    return { batch, barcodeImage: barcodeImage.toString('base64') };
  }

  private generateBarcode(): string {
    return (
      'BATCH-' +
      Date.now().toString(36) +
      Math.random().toString(36).substr(2, 5)
    );
  }

  async findByBarcode(barcode: string) {
    return this.prisma.batch.findFirst({
      where: { barcode },
      include: { productType: true, stockItems: true },
    });
  }
  
  async updateStatus(batchId: string, newStatus: BatchStatus) {
    // Проверяем существование партии
    const batch = await this.prisma.batch.findUnique({ 
      where: { id: batchId },
      select: { status: true }
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    // Валидация переходов статусов (простая логика)
    const validTransitions: Record<BatchStatus, BatchStatus[]> = {
      DRAFT: ['QUARANTINE', 'CERTIFIED'],
      QUARANTINE: ['CERTIFIED'],
      CERTIFIED: ['ACTIVE', 'SHIPPED', 'SCRAPPED'],
      ACTIVE: ['SHIPPED', 'SCRAPPED'],
      SHIPPED: ['SCRAPPED'],
      SCRAPPED: [],
    };

    if (!validTransitions[batch.status as BatchStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot change status from ${batch.status} to ${newStatus}. ` +
        `Allowed transitions from ${batch.status}: ${validTransitions[batch.status as BatchStatus]?.join(', ') || 'none'}`
      );
    }

    const updated = await this.prisma.batch.update({
      where: { id: batchId },
      data: { status: newStatus },
      include: { 
        productType: true, 
        movements: {
          take: 5,
          orderBy: { date: 'desc' },
          include: { user: { select: { name: true } } }
        },
      },
    });

    return updated;
  }
}
