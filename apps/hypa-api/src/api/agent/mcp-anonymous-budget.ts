import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MCP_SPEND_CAP_USD } from '@hypa/config/agent';
import { DbService } from 'src/libs/db/db.service';

/** A conservative allowance shared by every replica, reset at midnight UTC. */
@Injectable()
export class McpAnonymousBudget {
  constructor(private readonly db: DbService) {}

  forRequest(anonymous: boolean): () => Promise<void> {
    let reservation: Promise<void> | undefined;
    return () =>
      anonymous ? (reservation ??= this.reserve()) : Promise.resolve();
  }

  private async reserve(): Promise<void> {
    const configured = process.env.MCP_ANONYMOUS_DAILY_BUDGET_USD;
    const usd = configured === undefined ? 10 : Number(configured);
    const limit = Math.floor(usd * 100);
    const cents = Math.ceil(MCP_SPEND_CAP_USD * 100);
    if (
      !Number.isFinite(usd) ||
      usd < 0 ||
      !Number.isSafeInteger(limit) ||
      limit > 2_147_483_647
    ) {
      throw new ServiceUnavailableException(
        'Invalid MCP anonymous daily budget configuration',
      );
    }
    if (limit < cents) throw this.exhausted();
    // Reserve the entire POST cap before any tool runs. Do not release it on
    // failure or process exit: paid work may already have reached a provider.
    // PostgreSQL serializes conflicting updates, including across replicas.
    const rows = await this.db.$queryRaw<{ reserved_cents: number }[]>`
      INSERT INTO mcp_anonymous_budget (day, reserved_cents)
      VALUES (to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD'), ${cents})
      ON CONFLICT (day) DO UPDATE
      SET reserved_cents = mcp_anonymous_budget.reserved_cents + EXCLUDED.reserved_cents
      WHERE mcp_anonymous_budget.reserved_cents + EXCLUDED.reserved_cents <= ${limit}
      RETURNING reserved_cents
    `;
    if (!rows.length) throw this.exhausted();
  }

  private exhausted() {
    return new ServiceUnavailableException(
      'Anonymous MCP daily allowance exhausted. Use an API key or sign in.',
    );
  }
}
