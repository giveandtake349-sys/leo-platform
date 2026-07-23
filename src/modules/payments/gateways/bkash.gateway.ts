import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BkashPaymentInitResponse {
  paymentID: string;
  bkashURL: string;
  amount: string;
  transactionStatus: string;
}

@Injectable()
export class BkashGateway {
  private readonly logger = new Logger(BkashGateway.name);
  private tokenCache: { token: string; expiry: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return this.config.get('BKASH_BASE_URL', 'https://tokenized.sandbox.bka.sh/v1.2.0-beta');
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiry) {
      return this.tokenCache.token;
    }
    // Dynamic import axios to avoid issues if not installed
    const axios = require('axios');
    const res = await axios.post(
      `${this.baseUrl}/tokenized/checkout/token/grant`,
      {
        app_key: this.config.get('BKASH_APP_KEY'),
        app_secret: this.config.get('BKASH_APP_SECRET'),
      },
      {
        headers: {
          username: this.config.get('BKASH_USERNAME'),
          password: this.config.get('BKASH_PASSWORD'),
        },
      },
    );
    const token = res.data.id_token as string;
    this.tokenCache = { token, expiry: Date.now() + 3500 * 1000 };
    return token;
  }

  async createPayment(params: {
    amount: number;
    invoiceNumber: string;
    callbackUrl: string;
  }): Promise<BkashPaymentInitResponse> {
    const axios = require('axios');
    const token = await this.getToken();
    const res = await axios.post(
      `${this.baseUrl}/tokenized/checkout/create`,
      {
        mode: '0011',
        payerReference: params.invoiceNumber,
        callbackURL: params.callbackUrl,
        amount: params.amount.toFixed(2),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: params.invoiceNumber,
      },
      {
        headers: {
          Authorization: token,
          'X-App-Key': this.config.get('BKASH_APP_KEY'),
        },
      },
    );
    return res.data;
  }

  verifyWebhookSignature(signature: string, rawBody: string): boolean {
    if (!signature || !rawBody) return false;
    const { createHmac } = require('crypto');
    const expected = createHmac('sha256', this.config.get('BKASH_APP_SECRET', ''))
      .update(rawBody)
      .digest('hex');
    return signature === expected;
  }
}
