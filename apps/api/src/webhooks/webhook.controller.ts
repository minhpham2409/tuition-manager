import { Controller, Post, Get, Body, UseGuards, Request, Query, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private svc: WebhookService,
    private config: ConfigService,
  ) {}

  // Public endpoint - called by SePay/Casso when bank receives transfer
  // Secured by API Key (configured in SePay dashboard)
  @Post('payment')
  async handlePayment(
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
  ) {
    // Verify API key if configured
    const apiKey = this.config.get('WEBHOOK_API_KEY');
    if (apiKey) {
      const provided = (authHeader || '').replace('Apikey ', '').trim();
      if (provided !== apiKey) {
        this.logger.warn('Webhook called with invalid API key');
        throw new UnauthorizedException('Invalid API key');
      }
    }

    this.logger.log(`Webhook received: ${JSON.stringify(body)}`);
    const result = await this.svc.handlePayment(body);

    // SePay requires response: { "success": true }
    return { success: true, ...result };
  }

  // Protected - get recent transactions for dashboard
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  getTransactions(@Request() req, @Query('limit') limit?: string) {
    return this.svc.getRecentTransactions(req.user.userId, limit ? parseInt(limit) : 20);
  }
}
