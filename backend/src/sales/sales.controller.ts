import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { SalesService } from './sales.service';

import { CreateSaleDto } from './dto/create-sale.dto';

import { ConfirmSaleDto } from './dto/confirm-sale.dto';

import { UpdateSalePriceDto } from './dto/update-sale-price.dto';

@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
  ) {}

  // ==========================================
  // GET ALL SALES
  // ==========================================

  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  // ==========================================
  // GET SINGLE SALE
  // ==========================================

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.salesService.findOne(
      Number(id),
    );
  }

  // ==========================================
  // CREATE SALE
  // ==========================================

  @Post()
  create(
    @Body()
    createSaleDto: CreateSaleDto,
  ) {
    return this.salesService.create(
      createSaleDto,
    );
  }

  // ==========================================
  // UPDATE SALE PRICE
  // ==========================================

  @Put(':id/price')
  updatePrice(
    @Param('id') id: string,
    @Body()
    updateSalePriceDto: UpdateSalePriceDto,
  ) {
    return this.salesService.updatePrice(
      Number(id),
      updateSalePriceDto,
    );
  }

  // ==========================================
  // CONFIRM SALE
  // ==========================================

  @Put(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Body()
    confirmSaleDto: ConfirmSaleDto,
  ) {
    return this.salesService.confirmSale(
      Number(id),
      confirmSaleDto,
    );
  }

  // ==========================================
  // DELETE DRAFT SALE
  // ==========================================

  @Delete(':id')
  delete(
    @Param('id') id: string,
  ) {
    return this.salesService.deleteDraftSale(
      Number(id),
    );
  }
}