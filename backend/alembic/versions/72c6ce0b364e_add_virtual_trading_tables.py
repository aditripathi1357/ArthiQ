"""add_virtual_trading_tables

Revision ID: 72c6ce0b364e
Revises: a55f79afadf1
Create Date: 2026-06-07 14:12:38.216146

This migration ONLY modifies the virtual_* tables and monthly_leaderboard.
All other table changes (companies, news, etc.) were stripped out to avoid
InsufficientPrivilege errors when running as a non-owner DB user.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = '72c6ce0b364e'
down_revision: Union[str, None] = 'a55f79afadf1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── virtual_accounts ─────────────────────────────────────────────────────
    op.add_column('virtual_accounts',
        sa.Column('realized_pnl', sa.Numeric(15, 2), nullable=False,
                  server_default='0'))
    op.add_column('virtual_accounts',
        sa.Column('reset_date', sa.Date(), nullable=False,
                  server_default=sa.text('CURRENT_DATE'),
                  comment='Date of last monthly reset'))
    op.add_column('virtual_accounts',
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False))
    op.add_column('virtual_accounts',
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False))
    # Change user_id from UUID ref to plain VARCHAR (Supabase UID)
    op.execute("ALTER TABLE virtual_accounts DROP CONSTRAINT IF EXISTS virtual_accounts_user_id_fkey")
    op.execute("ALTER TABLE virtual_accounts ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text")
    op.execute("ALTER TABLE virtual_accounts DROP COLUMN IF EXISTS realized_profit_loss")
    op.execute("ALTER TABLE virtual_accounts DROP COLUMN IF EXISTS last_reset_at")

    # ── virtual_holdings ─────────────────────────────────────────────────────
    op.add_column('virtual_holdings',
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('virtual_holdings',
        sa.Column('company_name', sa.String(255), nullable=True))
    op.add_column('virtual_holdings',
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False))
    op.add_column('virtual_holdings',
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False))
    op.execute("ALTER TABLE virtual_holdings DROP CONSTRAINT IF EXISTS virtual_holdings_user_id_fkey")
    op.execute("ALTER TABLE virtual_holdings ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text")
    op.execute("ALTER TABLE virtual_holdings ALTER COLUMN quantity TYPE INTEGER USING quantity::integer")
    op.execute("ALTER TABLE virtual_holdings ALTER COLUMN average_price TYPE NUMERIC(12,4) USING average_price::numeric")
    # Back-fill account_id from virtual_accounts
    op.execute("""
        UPDATE virtual_holdings h
        SET account_id = a.id
        FROM virtual_accounts a
        WHERE a.user_id = h.user_id
    """)
    op.alter_column('virtual_holdings', 'account_id', nullable=False)
    op.create_foreign_key(
        None, 'virtual_holdings', 'virtual_accounts',
        ['account_id'], ['id'], ondelete='CASCADE'
    )

    # ── virtual_transactions ─────────────────────────────────────────────────
    op.add_column('virtual_transactions',
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('virtual_transactions',
        sa.Column('company_name', sa.String(255), nullable=True))
    op.add_column('virtual_transactions',
        sa.Column('transaction_type', sa.String(4), nullable=True,
                  comment='BUY | SELL'))
    op.add_column('virtual_transactions',
        sa.Column('total_value', sa.Numeric(15, 2), nullable=True,
                  comment='quantity × price'))
    op.add_column('virtual_transactions',
        sa.Column('realized_pnl', sa.Numeric(15, 2), nullable=False,
                  server_default='0',
                  comment='Realized P&L on SELL; 0 for BUY'))
    op.execute("ALTER TABLE virtual_transactions DROP CONSTRAINT IF EXISTS virtual_transactions_user_id_fkey")
    op.execute("ALTER TABLE virtual_transactions ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text")
    op.execute("ALTER TABLE virtual_transactions ALTER COLUMN quantity TYPE INTEGER USING quantity::integer")
    op.execute("ALTER TABLE virtual_transactions ALTER COLUMN price TYPE NUMERIC(12,4) USING price::numeric")
    # Copy buy_or_sell → transaction_type if it exists
    op.execute("""
        UPDATE virtual_transactions
        SET transaction_type = UPPER(buy_or_sell)
        WHERE buy_or_sell IS NOT NULL AND transaction_type IS NULL
    """)
    # Back-fill account_id
    op.execute("""
        UPDATE virtual_transactions t
        SET account_id = a.id
        FROM virtual_accounts a
        WHERE a.user_id = t.user_id
    """)
    # Fill total_value = quantity * price where missing
    op.execute("""
        UPDATE virtual_transactions
        SET total_value = quantity * price
        WHERE total_value IS NULL
    """)
    op.alter_column('virtual_transactions', 'account_id', nullable=False)
    op.alter_column('virtual_transactions', 'transaction_type', nullable=False)
    op.alter_column('virtual_transactions', 'total_value', nullable=False)
    op.create_foreign_key(
        None, 'virtual_transactions', 'virtual_accounts',
        ['account_id'], ['id'], ondelete='CASCADE'
    )
    op.create_index('ix_virtual_transactions_account_id', 'virtual_transactions', ['account_id'])
    op.create_index('ix_virtual_transactions_timestamp',  'virtual_transactions', ['timestamp'])
    op.execute("ALTER TABLE virtual_transactions DROP COLUMN IF EXISTS buy_or_sell")

    # ── monthly_leaderboard ───────────────────────────────────────────────────
    op.add_column('monthly_leaderboard',
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('monthly_leaderboard',
        sa.Column('display_name', sa.String(100), nullable=True,
                  comment='Email prefix shown on leaderboard'))
    op.add_column('monthly_leaderboard',
        sa.Column('month', sa.Integer(), nullable=True))
    op.add_column('monthly_leaderboard',
        sa.Column('year', sa.Integer(), nullable=True))
    op.add_column('monthly_leaderboard',
        sa.Column('starting_balance', sa.Numeric(15, 2), nullable=False,
                  server_default='100000'))
    op.add_column('monthly_leaderboard',
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False))
    op.execute("ALTER TABLE monthly_leaderboard DROP CONSTRAINT IF EXISTS monthly_leaderboard_user_id_fkey")
    op.execute("ALTER TABLE monthly_leaderboard ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text")
    # Parse month_year into month + year (format assumed: YYYY-MM)
    op.execute("""
        UPDATE monthly_leaderboard
        SET
          month = CAST(SPLIT_PART(month_year, '-', 2) AS INTEGER),
          year  = CAST(SPLIT_PART(month_year, '-', 1) AS INTEGER)
        WHERE month_year IS NOT NULL
    """)
    # Back-fill account_id
    op.execute("""
        UPDATE monthly_leaderboard lb
        SET account_id = a.id
        FROM virtual_accounts a
        WHERE a.user_id = lb.user_id
    """)
    op.execute("DROP INDEX IF EXISTS ix_monthly_leaderboard_month_year")
    op.execute("ALTER TABLE monthly_leaderboard DROP COLUMN IF EXISTS month_year")
    op.alter_column('monthly_leaderboard', 'month', nullable=False,
                    server_default=sa.text('EXTRACT(MONTH FROM NOW())::int'))
    op.alter_column('monthly_leaderboard', 'year',  nullable=False,
                    server_default=sa.text('EXTRACT(YEAR FROM NOW())::int'))


def downgrade() -> None:
    # Intentionally minimal — restore only what's needed
    op.execute("ALTER TABLE monthly_leaderboard DROP COLUMN IF EXISTS account_id")
    op.execute("ALTER TABLE monthly_leaderboard DROP COLUMN IF EXISTS display_name")
    op.execute("ALTER TABLE monthly_leaderboard DROP COLUMN IF EXISTS month")
    op.execute("ALTER TABLE monthly_leaderboard DROP COLUMN IF EXISTS year")
    op.execute("ALTER TABLE monthly_leaderboard DROP COLUMN IF EXISTS starting_balance")
    op.execute("ALTER TABLE monthly_leaderboard DROP COLUMN IF EXISTS updated_at")
    op.execute("ALTER TABLE virtual_transactions DROP COLUMN IF EXISTS account_id")
    op.execute("ALTER TABLE virtual_transactions DROP COLUMN IF EXISTS company_name")
    op.execute("ALTER TABLE virtual_transactions DROP COLUMN IF EXISTS transaction_type")
    op.execute("ALTER TABLE virtual_transactions DROP COLUMN IF EXISTS total_value")
    op.execute("ALTER TABLE virtual_transactions DROP COLUMN IF EXISTS realized_pnl")
    op.execute("ALTER TABLE virtual_holdings DROP COLUMN IF EXISTS account_id")
    op.execute("ALTER TABLE virtual_holdings DROP COLUMN IF EXISTS company_name")
    op.execute("ALTER TABLE virtual_holdings DROP COLUMN IF EXISTS created_at")
    op.execute("ALTER TABLE virtual_holdings DROP COLUMN IF EXISTS updated_at")
    op.execute("ALTER TABLE virtual_accounts DROP COLUMN IF EXISTS realized_pnl")
    op.execute("ALTER TABLE virtual_accounts DROP COLUMN IF EXISTS reset_date")
    op.execute("ALTER TABLE virtual_accounts DROP COLUMN IF EXISTS created_at")
    op.execute("ALTER TABLE virtual_accounts DROP COLUMN IF EXISTS updated_at")
