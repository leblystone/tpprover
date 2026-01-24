# ⚡ Ghost Worker Quick Start Card

**Print this or keep it handy during deployment!**

---

## 🔑 API KEYS YOU NEED

| API Key | Get From | Starts With |
|---------|----------|-------------|
| **Gemini** | https://aistudio.google.com/app/apikey | `AIza...` |
| **Anthropic** | https://console.anthropic.com/ | `sk-ant-...` |
| **Telegram Bot** | @BotFather on Telegram → `/newbot` | `123456:ABC...` |
| **Telegram Chat ID** | Message bot, then: `https://api.telegram.org/botTOKEN/getUpdates` | `987654321` |

---

## ⚡ DEPLOYMENT COMMANDS

```bash
# 1. Install (in functions folder)
npm install @google/generative-ai@latest @anthropic-ai/sdk@latest

# 2. Set Secrets
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID

# 3. Deploy
firebase deploy --only functions

# 4. Watch Logs
firebase functions:log --only ghostWorkerTriage
```

---

## 🧪 TESTING STEPS

1. Open admin panel → Ghost Worker Dashboard
2. Enter existing ticket ID
3. Click "Test"
4. Review: Route? Response? Cost?
5. Repeat with 5-10 tickets

---

## 📱 TELEGRAM SETUP (10 minutes)

1. Message `@BotFather`
2. Send: `/newbot`
3. Name: "The Pep Planner Ghost Worker"
4. Username: `pepplanner_ghost_bot`
5. Save bot token
6. Message your bot: "Hello"
7. Visit: `https://api.telegram.org/botYOUR_TOKEN/getUpdates`
8. Copy chat ID from response

---

## 🚨 EMERGENCY CONTROLS

**Stop Ghost Worker:**
- Admin Dashboard → Click "🛑 Emergency Stop"
- Or auto-pauses at $2/day

**Resume Ghost Worker:**
- Admin Dashboard → Click "▶️ Resume"

---

## 💰 EXPECTED COSTS (1-3 tickets/day)

- **Daily:** $0.01-0.03
- **Monthly:** $0.30-0.90
- **Way under your $45/month budget!**

---

## ✅ POST-DEPLOYMENT CHECKLIST

- [ ] Test on 5+ existing tickets
- [ ] Verify Telegram approval works
- [ ] Check `ai_worker_logs` for cost entries
- [ ] Emergency stop works
- [ ] Resume works
- [ ] Review handbook for accuracy

---

## 📖 FULL GUIDES

- **Setup:** `GHOST_WORKER_DEPLOYMENT_GUIDE.md`
- **Telegram:** `TELEGRAM_BOT_SETUP.md`
- **Knowledge Base:** `THE_PEP_PLANNER_HANDBOOK.md` (⭐ REVIEW)
- **Start Point:** `START_HERE.md`

---

## 🎯 SUCCESS = 

✅ Ghost Worker routes correctly (>90% accuracy)  
✅ Responses sound like you (no dev jargon)  
✅ Costs under $0.05/day  
✅ Telegram approval smooth  
✅ Users get help fast (<2 min)

---

**Keep this card handy during deployment!** 📱✨
