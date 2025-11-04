import { BadRequestException, Body, Controller, Get, Param, Post, Put } from '@nestjs/common'
import { BatchStatus } from '@prisma/client'
import { BatchesService } from './batches.service'

interface UpdateStatusDto {
  status: BatchStatus;
}

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

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    if (!Object.values(BatchStatus).includes(updateStatusDto.status)) {
      throw new BadRequestException(
        `Invalid status: ${updateStatusDto.status}. Valid statuses: ${Object.values(BatchStatus).join(', ')}`,
      );
    }
    return this.batchesService.updateStatus(id, updateStatusDto.status);
  }
}
