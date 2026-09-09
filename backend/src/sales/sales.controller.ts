import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ConfirmSaleDto } from './dto/confirm-sale.dto';
import { UpdateSalePriceDto } from './dto/update-sale-price.dto';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(Number(id));
  }

  @Post()
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @Put(':id/price')
  updatePrice(
    @Param('id') id: string,
    @Body() updateSalePriceDto: UpdateSalePriceDto,
  ) {
    return this.salesService.updatePrice(Number(id), updateSalePriceDto);
  }

  @Put(':id/confirm')
  confirm(@Param('id') id: string, @Body() confirmSaleDto: ConfirmSaleDto) {
    return this.salesService.confirmSale(Number(id), confirmSaleDto);
  }
}
