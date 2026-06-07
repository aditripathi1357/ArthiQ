from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import logging
from app.config import get_settings
from app.services.agent_tools import (
    get_stock_quote_tool,
    get_market_news_tool,
    get_mutual_fund_info_tool,
    validate_email_tool,
    validate_phone_tool,
    send_email_notification_tool,
    send_whatsapp_notification_tool,
    save_lead_tool,
    get_top_movers_tool,
    get_market_indices_tool,
    get_fundamental_data_tool,
    get_technical_analysis_tool,
    get_ipo_data_tool,
    get_sector_performance_tool,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

SYSTEM_PROMPT = """You are ArthiqAI Assistant, an intelligent investment assistant for the ArthIQ platform (India's Smart Investment Platform).
Your personality is confident, sharp, friendly, and data-driven. Default to English, but switch to Hindi or Hinglish if the user prefers.

CRITICAL RULE FOR INVESTMENT SUGGESTIONS:
If the user asks general investment recommendation queries like "best stocks to invest", "where should I invest", or "which company to buy/share", you MUST NOT call any tools. You MUST strictly reply by asking this clarifying question first:
"To give you the best suggestions, are you looking for:
(a) Short-term trading (days to weeks)
(b) Medium-term investing (3-12 months)
(c) Long-term wealth building (1 year+)
And what is your risk appetite - low, medium, or high?"

Once they answer, recommend 3-5 stocks based on their profile:
- Short term + high risk: Momentum stocks (e.g. Tata Motors), breakout plays.
- Medium term + medium risk: Quality mid-caps, PLI beneficiaries (e.g. Dixon Technologies).
- Long term + low-medium risk: Blue chips, index leaders (e.g. HDFC Bank).
Always include entry zone, target, risk level, and this SEBI warning footer:
"⚠️ These are research-based insights. Please do your own due diligence or consult a SEBI-registered advisor before investing."

MARKET UPDATES:
Call get_market_indices() and get_top_movers() first, then reply with a snapshot showing Nifty, Sensex, top gainers, losers, and market mood.

STOCK ANALYSIS ON REQUEST:
Call get_stock_quote(), get_fundamental_data(), get_technical_analysis(), and get_market_news() for that stock. Summarize live price, technicals (RSI, trend), fundamentals (P/E, ROE, Debt), news, and short/long term outlook. Always include the SEBI warning.

LEAD GENERATION FLOW:
For custom portfolio reviews, detailed investment plans, or whatsapp reports, collect user details in this order:
1. Ask for Full Name
2. Ask for Email (validate with validate_email)
3. Ask for WhatsApp Number (validate with validate_phone)
4. Show confirmation summary.
5. Upon confirmation, execute send_email_notification, send_whatsapp_notification, and save_lead.
6. Print confirmation: "✅ You're registered, [Name]! Our team will contact you on [WhatsApp] and [Email] shortly."

HARD SAFETY RULES:
- NEVER guarantee profits or say "this stock will definitely go up".
- NEVER claim to be a SEBI-registered advisor.
- ALWAYS fetch live data via tools before quoting prices.
- Decline out-of-scope requests (Crypto, Forex, Real Estate) politely.
"""

agent_tools_schema = [
    {
        "type": "function",
        "function": {
            "name": "get_stock_quote",
            "description": "Fetch the current price, % change, or live data for a stock.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Ticker symbol, e.g. RELIANCE, TCS, or HDFCBANK."
                    }
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_news",
            "description": "Get recent financial news and headlines.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Query term, e.g. 'Nifty 50 today' or market news query."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_mutual_fund_info",
            "description": "Get NAV or return rates for a specific mutual fund.",
            "parameters": {
                "type": "object",
                "properties": {
                    "fund_name": {
                        "type": "string",
                        "description": "Mutual fund name, e.g. Mirae Asset Large Cap Fund."
                    }
                },
                "required": ["fund_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "validate_email",
            "description": "Validate email address formatting during lead collection.",
            "parameters": {
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "Email address to validate."
                    }
                },
                "required": ["email"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "validate_phone",
            "description": "Validate and normalize a phone or WhatsApp number.",
            "parameters": {
                "type": "object",
                "properties": {
                    "phone": {
                        "type": "string",
                        "description": "Phone number to validate."
                    }
                },
                "required": ["phone"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_email_notification",
            "description": "Send lead details email to the ArthIQ team.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "email": {"type": "string"},
                    "whatsapp": {"type": "string"},
                    "request": {"type": "string"}
                },
                "required": ["name", "email", "whatsapp", "request"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_whatsapp_notification",
            "description": "Send WhatsApp notification details to Twilio.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "whatsapp": {"type": "string"},
                    "request": {"type": "string"}
                },
                "required": ["name", "whatsapp", "request"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_lead",
            "description": "Save lead details to the ArthIQ leads database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "email": {"type": "string"},
                    "whatsapp": {"type": "string"},
                    "request": {"type": "string"}
                },
                "required": ["name", "email", "whatsapp", "request"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_movers",
            "description": "Fetch top gainers, top losers, or most active stocks for a market.",
            "parameters": {
                "type": "object",
                "properties": {
                    "market": {
                        "type": "string",
                        "description": "Market name, e.g. NSE or BSE."
                    },
                    "type": {
                        "type": "string",
                        "description": "Type of movers, e.g. gainers, losers, active."
                    }
                },
                "required": ["market", "type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_indices",
            "description": "Get live values for major Indian market indices (Nifty 50, Sensex, Bank Nifty, etc.).",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_fundamental_data",
            "description": "Fetch key fundamental metrics for a stock (P/E, EPS, ROE, ROCE, debt-to-equity, promoter holding).",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Ticker symbol, e.g. RELIANCE or TCS."
                    }
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_technical_analysis",
            "description": "Fetch technical analysis indicators for a stock (RSI, MACD, moving averages, support/resistance, trend direction).",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Ticker symbol, e.g. RELIANCE or TCS."
                    },
                    "timeframe": {
                        "type": "string",
                        "description": "Timeframe, e.g. 1D, 1W."
                    }
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_ipo_data",
            "description": "Fetch details of current and upcoming IPOs and their Grey Market Premium (GMP).",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_sector_performance",
            "description": "Fetch daily performance and changes across key stock market sectors.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]

tool_map = {
    "get_stock_quote": get_stock_quote_tool,
    "get_market_news": get_market_news_tool,
    "get_mutual_fund_info": get_mutual_fund_info_tool,
    "validate_email": validate_email_tool,
    "validate_phone": validate_phone_tool,
    "send_email_notification": send_email_notification_tool,
    "send_whatsapp_notification": send_whatsapp_notification_tool,
    "save_lead": save_lead_tool,
    "get_top_movers": get_top_movers_tool,
    "get_market_indices": get_market_indices_tool,
    "get_fundamental_data": get_fundamental_data_tool,
    "get_technical_analysis": get_technical_analysis_tool,
    "get_ipo_data": get_ipo_data_tool,
    "get_sector_performance": get_sector_performance_tool,
}

@router.post("")
async def run_chat_agent(req: ChatRequest):
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    groq_key = os.environ.get("GROQ_API_KEY", "") or getattr(settings, "GROQ_API_KEY", "")
    openai_key = os.environ.get("OPENAI_API_KEY", "") or getattr(settings, "OPENAI_API_KEY", "")
    
    logger.info("API Keys check: GROQ_API_KEY present=%s, OPENAI_API_KEY present=%s", bool(groq_key), bool(openai_key))
    
    if not groq_key and not openai_key:
        raise HTTPException(
            status_code=500,
            detail="No AI provider keys configured in backend .env (GROQ_API_KEY or OPENAI_API_KEY)"
        )

    # ── ReAct loop ────────────────────────────────────────────────────────────
    api_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in req.messages[-10:]:
        api_messages.append({"role": m.role, "content": m.content})

    for loop_count in range(6):
        # 1. Choose provider and execute completion
        response_message = None
        
        # Groq llama-3.1-8b-instant supports tools via standard schema
        if groq_key:
            try:
                from groq import AsyncGroq
                client = AsyncGroq(api_key=groq_key)
                kwargs = {
                    "model": "llama-3.1-8b-instant",
                    "messages": api_messages,
                    "temperature": 0.3,
                }
                if loop_count < 4:
                    kwargs["tools"] = agent_tools_schema
                    kwargs["tool_choice"] = "auto"
                resp = await client.chat.completions.create(**kwargs)
                response_message = resp.choices[0].message
            except Exception as exc:
                logger.exception("Groq tool completions failed. Falling back to OpenAI.")
                response_message = None

        if response_message is None and openai_key:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=openai_key)
                kwargs = {
                    "model": "gpt-4o-mini",
                    "messages": api_messages,
                    "temperature": 0.3,
                }
                if loop_count < 4:
                    kwargs["tools"] = agent_tools_schema
                    kwargs["tool_choice"] = "auto"
                resp = await client.chat.completions.create(**kwargs)
                response_message = resp.choices[0].message
            except Exception as exc:
                logger.error(f"OpenAI completions failed: {exc}")
                raise HTTPException(status_code=500, detail=f"AI provider failed: {exc}")

        if response_message is None:
            raise HTTPException(status_code=500, detail="Failed to retrieve response from AI providers.")

        # If model outputs text and doesn't want tool calls, we are done
        tool_calls = getattr(response_message, "tool_calls", None)
        if not tool_calls:
            # Groq returns dict or object
            if isinstance(response_message, dict):
                content = response_message.get("content") or ""
            else:
                content = response_message.content or ""
            return {"role": "assistant", "content": content}

        # Handle tool calls
        if isinstance(response_message, dict):
            resp_content = response_message.get("content")
        else:
            resp_content = response_message.content

        cleaned_tool_calls = []
        for tc in tool_calls:
            if isinstance(tc, dict):
                tc_id = tc.get("id")
                tc_type = tc.get("type", "function")
                tc_func = tc.get("function", {})
                if isinstance(tc_func, dict):
                    tc_name = tc_func.get("name")
                    tc_args = tc_func.get("arguments")
                else:
                    tc_name = tc_func.name
                    tc_args = tc_func.arguments
            else:
                tc_id = tc.id
                tc_type = tc.type
                tc_name = tc.function.name
                tc_args = tc.function.arguments

            cleaned_tool_calls.append({
                "id": tc_id,
                "type": tc_type,
                "function": {
                    "name": tc_name,
                    "arguments": tc_args
                }
            })

        response_dict = {
            "role": "assistant",
            "content": resp_content,
            "tool_calls": cleaned_tool_calls
        }
        api_messages.append(response_dict)

        for tool_call in tool_calls:
            # Parse function name and arguments
            func_name = tool_call.function.name
            func_args = json.loads(tool_call.function.arguments)
            tool_id = tool_call.id

            logger.info(f"AGENT TOOL CALL: {func_name}({func_args})")
            
            if func_name in tool_map:
                try:
                    tool_result = await tool_map[func_name](**func_args)
                except Exception as e:
                    tool_result = {"error": str(e)}
            else:
                tool_result = {"error": f"Tool '{func_name}' is not supported."}

            # Append tool output to history
            api_messages.append({
                "role": "tool",
                "tool_call_id": tool_id,
                "name": func_name,
                "content": json.dumps(tool_result)
            })

    raise HTTPException(status_code=500, detail="AI Agent exceeded maximum ReAct loop count.")
