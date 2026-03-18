# HR System Backend - Cloudflare Workers

ဤဖိုင်သည် HR System ၏ Backend API ကို Cloudflare Workers တွင် Deploy လုပ်ရန်အတွက် သီးသန့်ထုတ်ပေးထားသော ဖိုင်များဖြစ်သည်။

## 🚀 Deployment လုပ်ရန် အဆင့်ဆင့်လမ်းညွှန်

### ၁။ Cloudflare Login လုပ်ခြင်း
```bash
npx wrangler login
```

### ၂။ Database နှင့် KV ဆောက်ခြင်း
```bash
# D1 Database ဆောက်ပါ
npx wrangler d1 create hr-system-db

# KV Namespace ဆောက်ပါ
npx wrangler kv:namespace create SESSIONS
```
အထက်ပါ command များမှ ရရှိလာသော `database_id` နှင့် `id` (KV) တို့ကို `wrangler.toml` ဖိုင်ထဲတွင် အစားထိုးထည့်သွင်းပါ။

### ၃။ Database Table များ တည်ဆောက်ခြင်း
```bash
npx wrangler d1 execute hr-system-db --remote --file=./migrations/001_initial_schema.sql
```

### ၄။ Dependencies များ Install လုပ်ခြင်း
```bash
npm install
```

### ၅။ Deploy လုပ်ခြင်း
```bash
npx wrangler deploy
```

---
**မှတ်ချက်:** Deploy လုပ်ပြီးပါက ရရှိလာသော Worker URL ကို မှတ်ထားပြီး Frontend configuration တွင် အသုံးပြုပါ။
