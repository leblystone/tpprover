# 🤖 Ghost Worker Quick Reference

## What Is Ghost Worker?

An intelligent AI automation system that:
- **Triages** support tickets using Gemini Flash (fast/cheap)
- **Routes** to the right specialist:
  - 🎨 **Gemini Pro** → UI/UX, text changes, simple bugs
  - 🔧 **Claude Sonnet** → Payments, auth, complex logic
- **Responds** automatically (when enabled)
- **Learns** from human feedback

---

## 🎯 Routing Decision Tree

```
┌────────────────────────────────────┐
│  New Support Ticket Created        │
└────────────┬───────────────────────┘
             ▼
┌────────────────────────────────────┐
│  🧠 TRIAGE (Gemini Flash)          │
│  "What kind of task is this?"      │
└────────────┬───────────────────────┘
             ▼
     ┌───────┴───────┐
     ▼               ▼
┌─────────┐    ┌─────────────┐
│ Payment │    │ Visual/Text │
│ Mention?│    │ Only?       │
└────┬────┘    └──────┬──────┘
     │ YES            │ YES
     ▼                ▼
┌─────────┐    ┌─────────────┐
│ Claude  │    │  Gemini Pro │
│ Sonnet  │    │             │
└─────────┘    └─────────────┘
```

---

## 📊 Key Metrics

| Metric | Target | What It Means |
|--------|--------|---------------|
| **Confidence** | >80% | How sure the triage is about routing |
| **Accuracy** | >90% | % of correct routings (via human overrides) |
| **Cost/Ticket** | <$0.02 | Average AI cost per ticket |
| **Response Time** | <30s | Time from ticket creation to response |

---

## 🚦 Routing Rules (Simplified)

### Route to Gemini Pro if:
- ✅ UI/UX changes
- ✅ Text updates
- ✅ Simple visual bugs
- ✅ Email template edits
- ✅ Mobile responsiveness

### Route to Claude Sonnet if:
- ⚠️ Payment/billing/Stripe
- ⚠️ Authentication/security
- ⚠️ Database/Firestore
- ⚠️ Business logic (trials, access)
- ⚠️ Complex bugs with logs
- ⚠️ API integrations

### Special Cases:
- **When in doubt** → Claude Sonnet (safety first)
- **Low confidence (<80%)** → Human review
- **Forbidden actions** → Escalate to human

---

## 💰 Cost Comparison

| Model | Cost per 1M tokens | Typical Ticket | Use Case |
|-------|-------------------|----------------|----------|
| **Gemini Flash** | $0.075 | $0.0001 | Triage only |
| **Gemini Pro** | $1.25 | $0.005 | UI/UX tasks |
| **Claude Sonnet** | $3.00 | $0.015 | Complex tasks |

**Average ticket cost: $0.001 - $0.02** (vs. human: $20-50)

---

## 🎛️ Configuration Quick Access

File: `functions/ghostWorker.js`

```javascript
const CONFIG = {
  routing: {
    confidenceThreshold: 80,      // 👈 Adjust this
    enableAutoResponse: false,    // 👈 Enable after testing
    observationMode: true,        // 👈 Disable to go live
  }
};
```

---

## 🔧 Common Commands

### Deploy Ghost Worker
```bash
firebase deploy --only functions:ghostWorkerTriage
```

### View Logs
```bash
firebase functions:log --only ghostWorkerTriage
```

### Set API Keys
```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set ANTHROPIC_API_KEY
```

### Check Stats (from app)
```javascript
const functions = getFunctions();
const getStats = httpsCallable(functions, 'getGhostWorkerStats');
const result = await getStats();
console.log(result.data.stats);
```

---

## 🚨 Safety Features

1. **Confidence Threshold** - Won't act if unsure
2. **Forbidden Actions List** - Blocks dangerous commands
3. **Observation Mode** - Log decisions without posting
4. **Human Override** - Teach correct routing
5. **Auto-Escalation** - Flags critical issues
6. **Audit Trail** - Every decision logged

---

## 📈 Success Criteria

After 2 weeks of observation mode:

- ✅ **90%+ routing accuracy** (check human overrides)
- ✅ **Average confidence >85%**
- ✅ **Zero safety violations**
- ✅ **Cost per ticket <$0.02**

When these are met → **Enable auto-response!**

---

## 🆘 Emergency Disable

If Ghost Worker goes rogue:

1. **Quick Fix**: Set `enableAutoResponse: false` in code
2. **Deploy**: `firebase deploy --only functions:ghostWorkerTriage`
3. **Or**: Disable function entirely in Firebase Console

---

## 📚 File Locations

| File | Purpose |
|------|---------|
| `functions/ghostWorker.js` | Main Ghost Worker logic |
| `src/components/admin/GhostWorkerDashboard.jsx` | Admin monitoring UI |
| `GHOST_WORKER_SETUP_GUIDE.md` | Detailed setup instructions |
| `GHOST_WORKER_MULTI_MODEL_ROUTER_PROPOSAL.md` | Full architecture docs |

---

## 🎓 Learning Resources

### Understanding the Models

**Gemini Flash 2.0**
- Best for: Classification, routing, triage
- Speed: Very fast (~1s)
- Cost: Very cheap ($0.075/1M tokens)
- Strengths: Quick decisions, good at categorization

**Gemini Pro 1.5**
- Best for: UI/UX, visual tasks, code generation
- Speed: Fast (~3-5s)
- Cost: Moderate ($1.25/1M tokens)
- Strengths: Understands design, React/Tailwind, responsive layout

**Claude Sonnet 4**
- Best for: Complex reasoning, debugging, architecture
- Speed: Moderate (~5-10s)
- Cost: Higher ($3/1M tokens)
- Strengths: Senior engineer thinking, payment logic, security

---

## 🎯 Optimization Tips

### Reduce Costs
1. Increase confidence threshold (fewer auto-responses)
2. Add better keyword detection (faster routing)
3. Cache common responses (future enhancement)

### Improve Accuracy
1. Review human overrides weekly
2. Update routing prompts based on patterns
3. Add ticket-type specific routing rules

### Speed Up Responses
1. Use smaller context windows
2. Parallelize API calls where possible
3. Cache triage decisions for similar tickets

---

## 🤝 Human-AI Collaboration

Ghost Worker is designed to **assist**, not replace humans:

- ✅ Handles 70-80% of simple tickets automatically
- ✅ Flags complex issues for human review
- ✅ Learns from human corrections
- ✅ Provides draft responses even in observation mode
- ✅ Always transparent (users know it's AI)

**Goal**: Free up your time for high-value work, not eliminate human judgment.

---

## 📞 Support

Questions? Issues? Suggestions?

1. Check `ghostWorkerLogs` in Firestore for detailed info
2. Review Firebase Functions logs
3. Test in observation mode first
4. Report bugs via support ticket 😄 (yes, we see the irony)

---

## 🚀 Roadmap (Future Enhancements)

- [ ] **Fine-tuning** - Train on your specific ticket history
- [ ] **Multi-language support** - Detect and respond in user's language
- [ ] **Sentiment analysis** - Detect frustrated users, prioritize
- [ ] **Auto-testing** - Generate and run tests for proposed fixes
- [ ] **Code PR creation** - Ghost Worker creates PRs for review
- [ ] **Slack integration** - Notify team of interesting patterns
- [ ] **A/B prompt testing** - Optimize prompts automatically

---

## 💡 Pro Tips

1. **Start conservative**: High confidence threshold (90%) initially
2. **Review daily**: Check logs for first 2 weeks
3. **Celebrate wins**: Track tickets resolved without human input
4. **Iterate prompts**: Small prompt changes = big accuracy gains
5. **Monitor costs**: Set billing alerts in Google Cloud
6. **Trust but verify**: Random sample checks even when confident

---

**Remember**: Ghost Worker is a tool, not magic. It learns from you. The more feedback you provide, the smarter it gets! 🧠✨
