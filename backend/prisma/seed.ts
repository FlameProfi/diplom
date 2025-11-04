import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

async function main() {
  // Очистка БД (опционально, для перезапуска seed)
  await prisma.batch.deleteMany();
  await prisma.productType.deleteMany();

  // Создание ProductType
  const productType = await prisma.productType.create({
    data: {
      name: 'Металлический порошок',
      category: 'Порошки',
      unit: 'кг',
      description: 'Порошок для 3D-печати',
    },
  });

  

  await prisma.batch.create({
    data: {
      batchNumber: 'BATCH-001',
      productTypeId: productType.id,
      quantity: 100.5,
      unit: 'кг',
      productionDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      barcode: 'BATCH-TEST-123',
      parameters: { granulometry: { min: 10, max: 50 }, composition: ['Fe 99%'] },
      status: 'ACTIVE',
    },
  });

  console.log('Seed данные добавлены!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });