import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { ConfirmSettlementDto } from './dto/confirm-settlement.dto';
import { ConfirmSaleSettlementsDto } from './dto/confirm-sale-settlements.dto';
import { SettlementsService } from './settlements.service';

@Controller('settlements')
export class SettlementsController {
  constructor(
    private readonly settlementsService: SettlementsService,
  ) {}

  // ==========================================
  // GET ALL SETTLEMENTS
  // ==========================================

  @Get()
  findAll() {
    return this.settlementsService.findAll();
  }

  // ==========================================
  // GET ALL CHECKS BY SALE
  // ==========================================

  @Get('sale/:saleId/check')
  getChecksBySale(
    @Param('saleId') saleId: string,
  ) {
    return this.settlementsService.getChecksBySale(
      Number(saleId),
    );
  }

  // ==========================================
  // GET SETTLEMENTS BY SALE
  // ==========================================

  @Get('sale/:saleId')
  findBySale(
    @Param('saleId') saleId: string,
  ) {
    return this.settlementsService.findBySale(
      Number(saleId),
    );
  }

  // ==========================================
  // CALCULATE SETTLEMENT
  // ==========================================

  @Get('calculate/:rubberWorkerId')
  calculate(
    @Param('rubberWorkerId') rubberWorkerId: string,
  ) {
    return this.settlementsService.calculateSettlement(
      Number(rubberWorkerId),
    );
  }

  // ==========================================
  // GET SINGLE SETTLEMENT
  // ==========================================

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.settlementsService.findOne(
      Number(id),
    );
  }

  // ==========================================
  // CONFIRM SINGLE SETTLEMENT
  // ==========================================

  @Post('confirm')
  confirm(
    @Body()
    confirmSettlementDto: ConfirmSettlementDto,
  ) {
    return this.settlementsService.confirmSettlement(
      confirmSettlementDto,
    );
  }

  // ==========================================
  // CONFIRM ALL SETTLEMENTS FOR A SALE
  // ==========================================

  @Post('confirm-sale')
  confirmSaleSettlements(
    @Body()
    confirmSaleSettlementsDto: ConfirmSaleSettlementsDto,
  ) {
    return this.settlementsService.confirmSaleSettlements(
      confirmSaleSettlementsDto.saleId,
    );
  }
}