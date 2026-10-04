import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PayOwnerSettlementDto } from './dto/pay-owner-settlement.dto';
import { OwnerSettlementsService } from './owner-settlements.service';

@Controller('owner-settlements')
export class OwnerSettlementsController {
  constructor(
    private readonly ownerSettlementsService: OwnerSettlementsService,
  ) {}

  // ==========================================
  // GET ALL OWNER SETTLEMENTS
  // ==========================================

  @Get()
  findAll() {
    return this.ownerSettlementsService.findAll();
  }

  // ==========================================
  // GET SINGLE OWNER SETTLEMENT
  // ==========================================

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ownerSettlementsService.findOne(Number(id));
  }

  // ==========================================
  // PAY OWNER SETTLEMENT
  // ==========================================

  @Post(':id/pay')
  payOwnerSettlement(
    @Param('id') id: string,
    @Body() payOwnerSettlementDto: PayOwnerSettlementDto,
  ) {
    return this.ownerSettlementsService.payOwnerSettlement(
      Number(id),
      payOwnerSettlementDto,
    );
  }
}
