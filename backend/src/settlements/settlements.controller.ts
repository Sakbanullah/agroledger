import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { ConfirmSettlementDto } from './dto/confirm-settlement.dto';
import { SettlementsService } from './settlements.service';
import { ConfirmSaleSettlementsDto } from './dto/confirm-sale-settlements.dto';

@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get()
  findAll() {
    return this.settlementsService.findAll();
  }

  @Get('sale/:saleId')
  findBySale(@Param('saleId') saleId: string) {
    return this.settlementsService.findBySale(Number(saleId));
  }

  @Get('calculate/:rubberWorkerId')
  calculate(@Param('rubberWorkerId') rubberWorkerId: string) {
    return this.settlementsService.calculateSettlement(Number(rubberWorkerId));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.settlementsService.findOne(Number(id));
  }

  @Post('confirm')
  confirm(@Body() confirmSettlementDto: ConfirmSettlementDto) {
    return this.settlementsService.confirmSettlement(confirmSettlementDto);
  }
  @Post('confirm-sale')
  confirmSaleSettlements(
    @Body() confirmSaleSettlementsDto: ConfirmSaleSettlementsDto,
  ) {
    return this.settlementsService.confirmSaleSettlements(
      confirmSaleSettlementsDto.saleId,
    );
  }
}
