import crypto from 'crypto';
import { CoreBankingAccount } from '../types/index.js';
import { Application } from '../models/Application.js';

export class CoreBankingMockService {
  /**
   * Idempotent account opening simulation as per Section 7 and FR-7.
   * Generates synthetic customer ID and account number for approved applications.
   */
  public async openAccount(applicationId: string): Promise<CoreBankingAccount> {
    const app = await Application.findOne({ applicationId });
    if (!app) {
      throw new Error(`Application ${applicationId} not found.`);
    }

    // Idempotency check: if already opened, return existing account details
    if (app.coreBankingAccount && app.coreBankingAccount.accountNumber) {
      return {
        customerId: app.coreBankingAccount.customerId,
        accountNumber: app.coreBankingAccount.accountNumber,
        accountType: 'SAVINGS',
        status: 'ACTIVE',
        openedAt: app.coreBankingAccount.openedAt,
      };
    }

    // Deterministic synthetic account generation based on applicationId
    const hash = crypto.createHash('sha256').update(applicationId).digest('hex');
    const customerId = `CUST-DDB-${hash.substring(0, 6).toUpperCase()}`;
    const accSuffix = parseInt(hash.substring(6, 14), 16).toString().padStart(8, '0').substring(0, 8);
    const accountNumber = `1001${accSuffix}`;
    const openedAt = new Date();

    const accountRecord: CoreBankingAccount = {
      customerId,
      accountNumber,
      accountType: 'SAVINGS',
      status: 'ACTIVE',
      openedAt,
    };

    app.coreBankingAccount = {
      customerId,
      accountNumber,
      openedAt,
    };
    await app.save();

    console.log(`[CoreBankingMock] Account opened for ${applicationId}: Customer ${customerId}, Account ${accountNumber}`);
    return accountRecord;
  }
}

export const coreBankingMock = new CoreBankingMockService();
