"""add missing user fields

Revision ID: b08e00df147c
Revises: 37d59c10c439
Create Date: 2026-06-07 06:51:06.339375

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b08e00df147c'
down_revision: Union[str, None] = '37d59c10c439'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Users ─────────────────────────────────────────────────────────────────
    op.add_column('users', sa.Column('supabase_user_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('email_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('users', sa.Column('whatsapp_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.create_index(op.f('ix_users_supabase_user_id'), 'users', ['supabase_user_id'], unique=True)

    # ── Research List ─────────────────────────────────────────────────────────
    op.add_column('research_list', sa.Column('company_name', sa.String(length=255), nullable=True))
    op.add_column('research_list', sa.Column('last_analyzed_at', sa.DateTime(timezone=True), nullable=True))
    try:
        op.drop_constraint('uq_user_stock_symbol', 'research_list', type_='unique')
    except Exception:
        pass

    # ── AI Research Reports ───────────────────────────────────────────────────
    op.add_column('ai_research_reports', sa.Column('company_name', sa.String(length=255), nullable=True))
    op.add_column('ai_research_reports', sa.Column('raw_data_json', sa.Text(), nullable=True))
    op.add_column('ai_research_reports', sa.Column('notification_sent', sa.String(length=5), nullable=False, server_default='false', comment="'true' | 'false' — reset each cycle"))
    op.add_column('ai_research_reports', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))


def downgrade() -> None:
    # ── AI Research Reports ───────────────────────────────────────────────────
    op.drop_column('ai_research_reports', 'updated_at')
    op.drop_column('ai_research_reports', 'notification_sent')
    op.drop_column('ai_research_reports', 'raw_data_json')
    op.drop_column('ai_research_reports', 'company_name')

    # ── Research List ─────────────────────────────────────────────────────────
    try:
        op.create_unique_constraint('uq_user_stock_symbol', 'research_list', ['user_id', 'stock_symbol'])
    except Exception:
        pass
    op.drop_column('research_list', 'last_analyzed_at')
    op.drop_column('research_list', 'company_name')

    # ── Users ─────────────────────────────────────────────────────────────────
    op.drop_index(op.f('ix_users_supabase_user_id'), table_name='users')
    op.drop_column('users', 'whatsapp_enabled')
    op.drop_column('users', 'email_enabled')
    op.drop_column('users', 'supabase_user_id')

    # ### end Alembic commands ###
