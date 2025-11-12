import { Module } from '@nestjs/common';
import { ScreenshotsController } from './screenshots.controller';
import { ScreenshotsService } from './screenshots.service';
import { TradingViewHelper } from '../../common/utils/tradingview.helper';
import { InvestingHelper } from '../../common/utils/investing.helper';
import { PlatformFactory } from '../../common/utils/platform.factory';

/**
 * Módulo de Screenshots
 * Maneja toda la lógica de captura de screenshots de gráficos financieros
 */
@Module({
  controllers: [ScreenshotsController],
  providers: [
    ScreenshotsService,
    TradingViewHelper,
    InvestingHelper,
    PlatformFactory,
  ],
  exports: [ScreenshotsService],
})
export class ScreenshotsModule {}
