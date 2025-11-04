import { Injectable } from '@nestjs/common'
import { createCanvas } from 'canvas'
import JsBarcode from 'jsbarcode'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.batch.findMany({
      include: { productType: true }, // Включаем связанные данные
    });
  }

  async findOne(id: string) {
    return this.prisma.batch.findUnique({
      where: { id },
      include: { productType: true },
    });
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
}
