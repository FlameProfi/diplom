import { Controller, Get, Param } from '@nestjs/common'
import { StockService } from './stock.service'

@Controller('stock')
export class StockController {
  constructor(private service: StockService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('batch/:batchId')
  findByBatch(@Param('batchId') batchId: string) {
    return this.service.findByBatch(batchId);
  }
}