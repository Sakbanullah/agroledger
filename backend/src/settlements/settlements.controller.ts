import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { ConfirmSettlementDto } from './dto/confirm-settlement.dto';
import { ConfirmSaleSettlementsDto } from './dto/confirm-sale-settlements.dto';
import { ReconcileSettlementDto } from './dto/reconcile-settlement.dto';
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

  // ==========================================
  // PAY WORKER SETTLEMENTS
  // Calculation is done; this is the step that hands money over.
  // ==========================================

  @Post('pay-sale')
  settleSale(
    @Body()
    confirmSaleSettlementsDto: ConfirmSaleSettlementsDto,
  ) {
    return this.settlementsService.settleSale(
      confirmSaleSettlementsDto.saleId,
    );
  }

  @Post(':id/pay')
  pay(
    @Param('id') id: string,
  ) {
    return this.settlementsService.paySettlement(Number(id));
  }

  // ==========================================
  // HISTORICAL RECONCILIATION
  //
  // No authentication is enforced here yet, so no trusted actor exists and
  // the audit row records a null actor. The body is never trusted for identity.
  // ==========================================

  @Post(':id/reconcile')
  reconcile(
    @Param('id') id: string,
    @Body() dto: ReconcileSettlementDto,
  ) {
    return this.settlementsService.reconcileSettlement(Number(id), dto);
  }

  @Get(':id/reconciliations')
  reconciliations(
    @Param('id') id: string,
  ) {
    return this.settlementsService.findReconciliations(Number(id));
  }

  @Get('reconciliation-count')
  reconciliationCount() {
    return this.settlementsService.countAwaitingReconciliation();
  }
}