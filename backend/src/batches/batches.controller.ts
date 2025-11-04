import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { BatchesService } from './batches.service'

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  findAll() {
    return this.batchesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.batchesService.findOne(id);
  }

  @Post()
  create(@Body() createBatchDto: any) {
    return this.batchesService.create(createBatchDto);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.batchesService.findByBarcode(barcode);
  }
}
