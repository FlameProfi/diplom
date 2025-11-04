import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common'
import { CustomersService } from './customers.service'

@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  findAll(@Query() query: { region?: string; country?: string }) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() createCustomerDto: any) {
    return this.service.create(createCustomerDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCustomerDto: any) {
    return this.service.update(id, updateCustomerDto);
  }
}