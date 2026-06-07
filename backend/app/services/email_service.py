"""
Email Service
=============
Sends professional HTML email notifications via Gmail SMTP.

Templates:
  - Research Report Email (AI analysis digest)
  - Daily Morning Digest
  - Earnings Alert
  - Breaking News Alert
  - Dividend Announcement Alert
"""

import logging
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ═══════════════════════════════════════════════════════════════════════════════
# SMTP Sender
# ═══════════════════════════════════════════════════════════════════════════════

def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Low-level SMTP send. Returns True on success."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            "Email not configured (SMTP_USER/SMTP_PASSWORD missing). "
            "Would send to %s: %s", to_email, subject
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"ArthiQ Alerts <{settings.SMTP_FROM}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())

        logger.info("Email sent to %s: %s", to_email, subject)
        return True

    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending to %s: %s", to_email, exc)
        return False
    except Exception as exc:
        logger.error("Unexpected email error for %s: %s", to_email, exc)
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# Email Templates
# ═══════════════════════════════════════════════════════════════════════════════

def _base_template(content: str, title: str = "ArthiQ Alert") -> str:
    """Shared base HTML wrapper with ArthiQ branding."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
<style>
  body {{ margin:0; padding:0; background:#f6f8fa; font-family:'Segoe UI',Arial,sans-serif; color:#0f172a; }}
  .container {{ max-width:640px; margin:32px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }}
  .header {{ background:linear-gradient(135deg,#FF9933 0%,#e6830a 100%); padding:28px 32px; text-align:center; }}
  .header h1 {{ margin:0; color:#fff; font-size:24px; font-weight:800; letter-spacing:-0.5px; }}
  .header p {{ margin:6px 0 0; color:rgba(255,255,255,0.85); font-size:13px; }}
  .body {{ padding:32px; }}
  .badge {{ display:inline-block; padding:4px 12px; border-radius:999px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:12px; }}
  .badge-positive {{ background:#dcfce7; color:#16a34a; }}
  .badge-negative {{ background:#fee2e2; color:#dc2626; }}
  .badge-neutral  {{ background:#f1f5f9; color:#64748b; }}
  .badge-bullish  {{ background:#dcfce7; color:#16a34a; }}
  .badge-bearish  {{ background:#fee2e2; color:#dc2626; }}
  .company-name {{ font-size:22px; font-weight:800; color:#0f172a; margin:0 0 4px; }}
  .symbol {{ font-size:13px; color:#64748b; font-weight:600; margin:0 0 20px; }}
  .summary {{ font-size:15px; line-height:1.7; color:#1e293b; margin:0 0 24px; }}
  .metric-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:20px 0; }}
  .metric-card {{ background:#f8fafc; border-radius:10px; padding:14px 16px; border:1px solid #e2e8f0; }}
  .metric-label {{ font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#94a3b8; margin:0 0 4px; }}
  .metric-value {{ font-size:16px; font-weight:800; color:#0f172a; margin:0; }}
  .confidence-bar {{ background:#f1f5f9; border-radius:999px; height:8px; margin:8px 0 4px; overflow:hidden; }}
  .confidence-fill {{ height:100%; border-radius:999px; background:linear-gradient(90deg,#FF9933,#16a34a); }}
  .section-title {{ font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#94a3b8; margin:24px 0 10px; }}
  .news-list {{ list-style:none; padding:0; margin:0; }}
  .news-list li {{ padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:14px; color:#334155; }}
  .news-list li:last-child {{ border-bottom:none; }}
  .news-list li::before {{ content:"📰 "; }}
  .events-list {{ list-style:none; padding:0; margin:0; }}
  .events-list li {{ padding:6px 0; font-size:14px; color:#334155; }}
  .events-list li::before {{ content:"⚡ "; }}
  .outlook {{ background:linear-gradient(135deg,#f0fdf4,#dcfce7); border-radius:10px; padding:16px; border-left:3px solid #16a34a; margin:16px 0; font-size:14px; line-height:1.6; color:#15803d; }}
  .cta {{ text-align:center; margin:28px 0 8px; }}
  .cta a {{ display:inline-block; background:#FF9933; color:#fff; font-weight:700; font-size:14px; padding:12px 28px; border-radius:10px; text-decoration:none; }}
  .footer {{ background:#f8fafc; padding:20px 32px; text-align:center; border-top:1px solid #e2e8f0; }}
  .footer p {{ margin:0; font-size:12px; color:#94a3b8; }}
  .footer a {{ color:#FF9933; text-decoration:none; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🇮🇳 ArthiQ</h1>
    <p>Your Personal Stock Research Assistant</p>
  </div>
  <div class="body">
    {content}
  </div>
  <div class="footer">
    <p>You're receiving this because you subscribed to ArthiQ research alerts.</p>
    <p style="margin-top:6px;"><a href="#">Manage Preferences</a> · <a href="#">Unsubscribe</a></p>
    <p style="margin-top:8px;">© 2026 ArthiQ Intelligence Platform</p>
  </div>
</div>
</body>
</html>"""


def _sentiment_badge(sentiment: str) -> str:
    labels = {"positive": "📈 Positive", "negative": "📉 Negative", "neutral": "➡️ Neutral"}
    css_class = f"badge badge-{sentiment}"
    return f'<span class="{css_class}">{labels.get(sentiment, sentiment)}</span>'


def _impact_badge(impact: str) -> str:
    labels = {"bullish": "🟢 Bullish", "bearish": "🔴 Bearish", "neutral": "🟡 Neutral"}
    css_class = f"badge badge-{impact}"
    return f'<span class="{css_class}">{labels.get(impact, impact)}</span>'


# ═══════════════════════════════════════════════════════════════════════════════
# Send Functions
# ═══════════════════════════════════════════════════════════════════════════════

def send_research_report_email(to_email: str, report: dict) -> bool:
    """Send a full AI research report email for one company."""
    symbol = report.get("symbol", "")
    company_name = report.get("company_name", symbol)
    sentiment = report.get("sentiment", "neutral")
    impact = report.get("impact_level", "neutral")
    confidence = int(report.get("confidence_score", 0.65) * 100)
    summary = report.get("summary", "")
    outlook = report.get("short_term_outlook", "")
    key_events = report.get("key_events", [])
    supporting = report.get("supporting_data", {})
    price = supporting.get("price", 0)
    change_pct = supporting.get("change_pct", 0)
    top_headlines = supporting.get("top_headlines", [])

    change_color = "#16a34a" if change_pct > 0 else "#dc2626" if change_pct < 0 else "#64748b"
    change_arrow = "▲" if change_pct > 0 else "▼" if change_pct < 0 else "▶"

    headlines_html = ""
    if top_headlines:
        items = "".join(f"<li>{h}</li>" for h in top_headlines[:5])
        headlines_html = f'<p class="section-title">Recent News</p><ul class="news-list">{items}</ul>'

    events_html = ""
    if key_events:
        items = "".join(f"<li>{e}</li>" for e in key_events[:4])
        events_html = f'<p class="section-title">Key Events</p><ul class="events-list">{items}</ul>'

    outlook_html = f'<p class="section-title">Short-Term Outlook</p><div class="outlook">{outlook}</div>' if outlook else ""

    content = f"""
    <p>
      {_sentiment_badge(sentiment)}
      &nbsp;{_impact_badge(impact)}
    </p>
    <p class="company-name">{company_name}</p>
    <p class="symbol">{symbol.replace('.NS', '').replace('.BO', '')} · NSE</p>

    <div class="metric-grid">
      <div class="metric-card">
        <p class="metric-label">Current Price</p>
        <p class="metric-value">₹{price:,.2f}</p>
      </div>
      <div class="metric-card">
        <p class="metric-label">Today's Change</p>
        <p class="metric-value" style="color:{change_color}">{change_arrow} {abs(change_pct):.2f}%</p>
      </div>
    </div>

    <p class="section-title">AI Research Summary</p>
    <p class="summary">{summary}</p>

    <p class="section-title">Confidence Score</p>
    <div class="confidence-bar">
      <div class="confidence-fill" style="width:{confidence}%"></div>
    </div>
    <p style="font-size:13px; color:#64748b; margin:0;">{confidence}% Confidence</p>

    {outlook_html}
    {events_html}
    {headlines_html}

    <div class="cta">
      <a href="{settings.FRONTEND_URL}/company/{symbol}/ai-insights">View Full Analysis →</a>
    </div>
    <p style="text-align:center; font-size:12px; color:#94a3b8; margin-top:8px;">
      Generated {datetime.now().strftime("%d %b %Y, %I:%M %p IST")}
    </p>
    """

    html = _base_template(content, title=f"ArthiQ Research: {company_name}")
    subject = f"🔬 Research Report: {company_name} — {sentiment.title()} Outlook"
    return _send_email(to_email, subject, html)


def send_daily_digest_email(to_email: str, reports: list[dict], user_name: str = "") -> bool:
    """Send a morning digest covering all user's research list stocks."""
    greeting = f"Good morning{', ' + user_name if user_name else ''}! ☀️"
    date_str = datetime.now().strftime("%A, %d %B %Y")

    cards = []
    for r in reports[:8]:
        symbol = r.get("symbol", "")
        name = r.get("company_name", symbol)
        sentiment = r.get("sentiment", "neutral")
        impact = r.get("impact_level", "neutral")
        summary_short = (r.get("summary") or "")[:120] + "..."
        confidence = int(r.get("confidence_score", 0.65) * 100)
        sup = r.get("supporting_data", {})
        change_pct = sup.get("change_pct", 0)
        change_color = "#16a34a" if change_pct > 0 else "#dc2626" if change_pct < 0 else "#64748b"

        cards.append(f"""
        <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div>
              <strong style="font-size:15px;">{name}</strong>
              <span style="color:#94a3b8; font-size:12px; margin-left:6px;">{symbol.replace('.NS','')}</span>
            </div>
            <span style="font-weight:700; color:{change_color}; font-size:14px;">{change_pct:+.1f}%</span>
          </div>
          {_sentiment_badge(sentiment)} &nbsp; {_impact_badge(impact)}
          <p style="font-size:13px; color:#334155; margin:10px 0 0; line-height:1.5;">{summary_short}</p>
          <p style="font-size:12px; color:#94a3b8; margin:6px 0 0;">Confidence: {confidence}%</p>
        </div>""")

    content = f"""
    <h2 style="font-size:20px; font-weight:800; margin:0 0 4px;">{greeting}</h2>
    <p style="color:#64748b; margin:0 0 24px;">{date_str} · Your Research Digest</p>
    <p style="font-size:14px; color:#334155; margin:0 0 20px;">
      Here's your personalized AI research update for <strong>{len(reports)}</strong> stocks on your research list:
    </p>
    {"".join(cards) if cards else '<p style="color:#64748b;">No stocks in your research list yet. Add stocks to start tracking.</p>'}
    <div class="cta">
      <a href="{settings.FRONTEND_URL}/notifications">View Full Research Dashboard →</a>
    </div>
    """

    html = _base_template(content, title="ArthiQ Morning Digest")
    subject = f"☀️ ArthiQ Morning Digest — {date_str}"
    return _send_email(to_email, subject, html)


def send_earnings_alert_email(to_email: str, symbol: str, company_name: str, earnings_data: dict) -> bool:
    """Send an earnings announcement alert."""
    date = earnings_data.get("date", "TBD")
    eps_est = earnings_data.get("eps_estimate", "N/A")
    rev_est = earnings_data.get("revenue_estimate", "N/A")

    content = f"""
    <span class="badge badge-neutral">📅 Earnings Alert</span>
    <p class="company-name">{company_name}</p>
    <p class="symbol">{symbol.replace('.NS', '')} · NSE</p>

    <div class="metric-grid">
      <div class="metric-card">
        <p class="metric-label">Earnings Date</p>
        <p class="metric-value">{date}</p>
      </div>
      <div class="metric-card">
        <p class="metric-label">EPS Estimate</p>
        <p class="metric-value">₹{eps_est}</p>
      </div>
    </div>

    <p class="summary">
      {company_name} has an upcoming earnings announcement on <strong>{date}</strong>.
      Analysts estimate EPS of ₹{eps_est} with estimated revenue of {rev_est}.
      Watch for significant price movement around this date.
    </p>

    <div class="cta">
      <a href="{settings.FRONTEND_URL}/company/{symbol}">View Company Details →</a>
    </div>
    """

    html = _base_template(content, title=f"Earnings Alert: {company_name}")
    subject = f"📅 Earnings Alert: {company_name} reports on {date}"
    return _send_email(to_email, subject, html)


def send_breaking_news_email(to_email: str, symbol: str, company_name: str, headline: str, sentiment: str = "neutral") -> bool:
    """Send a breaking news alert for a specific company."""
    content = f"""
    <span class="badge badge-{sentiment}">🔔 Breaking News</span>
    <p class="company-name">{company_name}</p>
    <p class="symbol">{symbol.replace('.NS', '')} · NSE</p>

    <div style="background:#fff7ed; border-left:4px solid #FF9933; border-radius:8px; padding:16px; margin:16px 0;">
      <p style="margin:0; font-size:16px; font-weight:600; color:#1e293b;">{headline}</p>
    </div>

    <p class="summary">
      A significant news event has been detected for {company_name}. This may impact the stock price.
      Our AI analysis will be updated shortly with full impact assessment.
    </p>

    <div class="cta">
      <a href="{settings.FRONTEND_URL}/company/{symbol}/ai-insights">View AI Analysis →</a>
    </div>
    """

    html = _base_template(content, title=f"Breaking News: {company_name}")
    subject = f"🔔 Breaking News: {company_name} — {headline[:60]}..."
    return _send_email(to_email, subject, html)


def send_dividend_alert_email(to_email: str, symbol: str, company_name: str, dividend_data: dict) -> bool:
    """Send a dividend declaration alert."""
    amount = dividend_data.get("amount", "N/A")
    ex_date = dividend_data.get("ex_date", "TBD")
    record_date = dividend_data.get("record_date", "TBD")
    payment_date = dividend_data.get("payment_date", "TBD")

    content = f"""
    <span class="badge badge-positive">💰 Dividend Declared</span>
    <p class="company-name">{company_name}</p>
    <p class="symbol">{symbol.replace('.NS', '')} · NSE</p>

    <div class="metric-grid">
      <div class="metric-card">
        <p class="metric-label">Dividend Amount</p>
        <p class="metric-value">₹{amount}</p>
      </div>
      <div class="metric-card">
        <p class="metric-label">Ex-Dividend Date</p>
        <p class="metric-value">{ex_date}</p>
      </div>
    </div>

    <p class="summary">
      {company_name} has declared a dividend of <strong>₹{amount}</strong> per share.
      You must hold the stock before the ex-date of {ex_date} to be eligible.
      Record date: {record_date}. Payment date: {payment_date}.
    </p>

    <div class="cta">
      <a href="{settings.FRONTEND_URL}/company/{symbol}">View Company →</a>
    </div>
    """

    html = _base_template(content, title=f"Dividend Alert: {company_name}")
    subject = f"💰 Dividend Alert: {company_name} declares ₹{amount} dividend"
    return _send_email(to_email, subject, html)
