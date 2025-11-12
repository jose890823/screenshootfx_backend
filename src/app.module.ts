import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScreenshotsModule } from './modules/screenshots/screenshots.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScreenshotsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
