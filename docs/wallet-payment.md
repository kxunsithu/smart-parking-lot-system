# ပိုက်ဆံအိတ် (Wallet) ဖြင့် သာ ငွေပေးချေသည့် စနစ် — အသေးစိတ် မှတ်တမ်း

> Smart Parking Lot System တွင် နေရာကြိုတင်စာရင်းသွင်းမှု (Booking) နှင့် Owner Subscription အားလုံးကို
> **ပိုက်ဆံအိတ် (Digital Wallet) မှတစ်ဆင့်သာ** ငွေပေးချေနိုင်ရန် ပြောင်းလဲထားသော စနစ်ဖြစ်သည်။
> ယခင်က အသုံးပြုခဲ့သော KBZPay / WavePay / AYA Pay / UABPay / Cash နည်းလမ်းများ ဖယ်ရှားပြီး
> ငွေပေးချေမှု အောင်မြင်မှသာ Session နှင့် Subscription သည် **ACTIVE** ဖြစ်လာသည်။

---

## ၁။ စနစ်၏ ခြုံငုံဖွဲ့စည်းပုံ (Architecture)

```
┌─────────────────────┐      ┌──────────────────────────────┐
│  smart-parking-api  │ ───► │  digital-wallet-backend-api  │
│  (FastAPI / Python) │      │  (Laravel)                    │
└──────────┬──────────┘      └──────────┬───────────────────┘
           │                            │
   Customer FE / Management FE    Wallet Admin FE (Top-ups)
```

- **Parking System (FastAPI)** — ငွေပေးချေရန် wallet သို့ တောင်းဆိုမှု (initiate) နှင့် အတည်ပြုမှု (confirm) ကို ခေါ်ဆိုသည်။
- **Wallet System (Laravel)** — ပိုက်ဆံအိတ် လက်ကျန်ကို စီမံပြီး OTP + PIN ဖြင့် ငွေပေးချေမှုကို အတည်ပြုပေးသည်။
- ငွေပေးချေမှု အတည်ပြုပြီးမှသာ parking session / subscription ကို **ACTIVE** ပြုလုပ်ပေးသည်။

---

## ၂။ Parking API (smart-parking-api) တွင် ထည့်သွင်းထားသော အချက်များ

### ၂.၁ အသစ် Model — `Payment`

| ကော်လံ | အဓိပ္ပါယ် |
|---|---|
| `user_id` | ငွေပေးချေသူ သုံးစွဲသူ |
| `session_id` / `subscription_id` | ပေးချေမှုနှင့် သက်ဆိုင်သော session / subscription |
| `wallet_payment_id` | Wallet စနစ်မှ ပြန်လာသော payment ID |
| `wallet_transaction_id` | အတည်ပြုပြီးနောက် wallet မှ transaction ID |
| `amount` / `fee` / `total` | စရိတ် / wallet အခကြေးငွေ / စုစုပေါင်း |
| `reference` | `PP-XXXXXXX` ပုံစံ ထူးခြားသော ကိုးကားနံပါတ် |
| `status` | `PENDING` → `COMPLETED` / `FAILED` / `EXPIRED` |

### ၂.၂ အသစ် API Endpoints

**Parking Session (Customer)**

| Method | Endpoint | အဓိပ္ပါယ် |
|---|---|---|
| `POST` | `/api/v1/parking-sessions/book` | PENDING session ဖန်တီးသည် (fee တွက်ပေးသည်) |
| `POST` | `/api/v1/parking-sessions/{id}/pay/initiate` | wallet payment တောင်းဆိုသည် (OTP ကို ဖုန်းသို့ SMS ပို့သည်) |
| `POST` | `/api/v1/parking-sessions/{id}/pay/confirm` | OTP + PIN ဖြင့် အတည်ပြုသည် → session **ACTIVE** |
| `PATCH` | `/api/v1/parking-sessions/{id}/finish` | Session ပြီးဆုံးစေသည် |

**Subscription (Owner / Admin)**

| Method | Endpoint | အဓိပ္ပါယ် |
|---|---|---|
| `POST` | `/api/v1/subscriptions/purchase` | PENDING subscription ဖန်တီးသည် |
| `POST` | `/api/v1/subscriptions/renew` | PENDING renewal ဖန်တီးသည် (ယခင် expiry မှ ဆက်ရေတွက်သည်) |
| `POST` | `/api/v1/subscriptions/{id}/pay/initiate` | wallet payment တောင်းဆိုသည် (OTP ကို ဖုန်းသို့ SMS ပို့သည်) |
| `POST` | `/api/v1/subscriptions/{id}/pay/confirm` | OTP + PIN အတည်ပြုသည် → subscription **ACTIVE** |

### ၂.၃ `pay/confirm` အတွက် Request Body

```json
{
  "otp_code": "123456",
  "pin": "1234"
}
```

### ၂.၄ Config (`.env`)

```
WALLET_API_BASE_URL=http://localhost:8001
WALLET_MERCHANT_API_KEY=           # ဖြည့်ရန် လိုအပ်သည် (real integration)
WALLET_REFERENCE_PREFIX=PP
```

> **သတိ**: `WALLET_MERCHANT_API_KEY` မဖြည့်ထားသရွေ့ testing အတွက်သာ အသုံးပြုနိုင်သည်။

### ၂.၅ အခြေအနေ (Status) စည်းမျဉ်းများ

- **Session**: `book` → `PENDING` → (pay confirm) → `ACTIVE` → (finish) → `FINISHED`
  - PENDING session ကို `finish` မလုပ်နိုင်ပါ (400 error)။
  - ACTIVE ဖြစ်ပြီးသား session ကို ပြန်ပေးချေ၍ မရပါ။
- **Subscription**: `purchase` / `renew` → `PENDING` → (pay confirm) → `ACTIVE`
  - ငွေမပေးရသေးသော (PENDING) subscription ဖြင့် parking lot ဖန်တီး၍ မရပါ (403 error)။
  - Renewal ကို ပေးချေပြီးပါက ယခင် ACTIVE subscription ၏ expiry နေ့မှ ဆက်၍ တွက်သည်။

### ၂.၆ ဖုန်းနံပါတ် လိုအပ်ချက်

- Customer ငွေပေးချေရန် သူ၏ ပရိုဖိုင်တွင် ဖုန်းနံပါတ် ထည့်ထားရမည် (`PUT /api/v1/auth/me` မှတစ်ဆင့်)။
- ဖုန်းနံပါတ် မရှိပါက "A phone number is required to pay with your wallet" error ပြန်သည်။
- ထို ဖုန်းနံပါတ်အတိုင်း wallet အကောင့် (Digital Wallet စနစ်တွင်) ရှိရမည်။

---

## ၃။ Wallet System (digital-wallet-backend-api — Laravel) ဖြည့်စွက်ချက်များ

### ၃.၁ Merchant API (ငွေပေးချေမှု အတွက် ရှိပြီးသား)

| Method | Endpoint | Body | ရလဒ် |
|---|---|---|---|
| `POST` | `/api/merchants/payment/initiate` | `customer_phone`, `amount`, `reference`, `description` | `payment_id`, `amount`, `fee`, `total` |
| `POST` | `/api/merchants/payment/confirm` | `payment_id`, `otp_code` (6), `pin` (4) | အောင်မြင်ပါက transaction ID |

Header: `X-API-Key: <merchant key>`

> OTP ကို initiate API မှ ပြန်မပို့ပါ — Wallet စနစ်က ဖောက်သည်၏ ဖုန်းနံပါတ်သို့ SMS ဖြင့် တိုက်ရိုက် ပို့သည်။

### ၃.၂ Wallet Top-up နှင့် Admin Approval

| Method | Endpoint | Role | အဓိပ္ပါယ် |
|---|---|---|---|
| `GET` | `/api/wallets/me` | Customer | မိမိ wallet အချက်အလက် |
| `POST` | `/api/wallets/topup` | Customer | Top-up လျှောက်သည် (`TP-XXXXXXXXXXXX` reference) |
| `GET` | `/api/wallets/topups` | Admin | Top-up စာရင်း (status / user_id စစ်ထုတ်၍ ရသည်) |
| `POST` | `/api/wallets/{id}/credit` | Admin | Wallet သို့ ငွေသွင်း (topup_id ပါပါက completed အဖြစ်မှတ်သည်) |
| `POST` | `/api/wallets/topups/{id}/approve` | Admin | Top-up ကို အတည်ပြုပြီး wallet သို့ အလိုအလျောက် ထည့်ပေးသည် |

> `approve` endpoint သည် user ၏ wallet ကို အလိုအလျောက်ရှာဖွေပြီး လက်ကျန်ထည့်ကာ top-up ကို `completed` ပြုလုပ်ပေးသည်။

---

## ၄။ Frontend အပြောင်းအလဲများ

### ၄.၁ Customer App (`smart-parking-customer`)

Booking flow အဆင့်များ:

```
1. Select (ကား + နေရာ ရွေးရန်)
2. Schedule (အချိန်ရွေးရန်)
3. Pay (OTP + PIN ထည့်၍ ငွေပေးချေရန်)  ← အသစ်
4. Success (ACTIVE ဖြစ်ကြောင်း ပြသရန်)
```

- `src/api/parkingSessions.ts` တွင် `payInitiate` / `payConfirm` ထည့်ထားသည်။
- `src/pages/ParkingDetail.tsx` တွင် **Pay** အဆင့် အသစ်ပါဝင်သည်။
  - Payment summary (fee / wallet fee / total) ပြသည်။
  - OTP 6 လုံး၊ PIN 4 လုံး ထည့်ရသည် (OTP ကို ဖုန်းသို့ SMS မှရသည်)။
  - OTP မှားလျှင် ပြန်ကြိုးစား၍ ရသည်။

### ၄.၂ Management App (`smart-parking-management`)

- **Owner Subscription Page** (`src/pages/owner/SubscriptionPage.tsx`)
  - ယခင်က payment method ရွေးချယ်မှု / QR / transaction ref များ ဖယ်ရှားပြီး **wallet ငွေပေးချေမှု** အစားထိုးထားသည်။
  - Modal flow: Confirm → PENDING subscription → initiate (OTP) → OTP+PIN → pay → ACTIVE
- **Admin Subscriptions Page** (`src/pages/admin/SubscriptionsPage.tsx`)
  - `payment_method` / `transaction_ref` ကော်လံများ ဖယ်ရှား။
  - PENDING status filter ထည့်ထားသည်။
- **Type** (`src/types/index.ts`) — `SubscriptionStatus` တွင် `PENDING` ထည့်ထားသည်။

### ၄.၃ Wallet Admin App (`digital-wallet-frontend-admin`)

- **Top-ups စာမျက်နှာ** အသစ် — `/wallets/topups`
  - Top-up စာရင်းကြည့်ခြင်း / status filter
  - Approve ခလုတ်ဖြင့် wallet သို့ ငွေထည့်ပေးခြင်း (confirmation dialog ပါသည်)
- Sidebar တွင် **Top-ups** လင့်ခ် ထည့်ထားသည်။

---

## ၅။ Testing

| စနစ် | Command | ရလဒ် |
|---|---|---|
| Parking API | `./venv/bin/python -m pytest -q` | 32 passed |
| Wallet API | `php artisan test` | 23 passed / 79 assertions |

- Parking tests တွင် `FakeWalletClient` ကို အသုံးပြုသည် (OTP `123456`, fee 1%)။
- Parking API မှ OTP ပြန်မပို့တော့ပါ — tests တွင် `123456` ကို တိုက်ရိုက် hardcode ထားသည်။

---

## ၆။ သတိပြုရမည့် အချက်များ

1. **Merchant API Key**: `WALLET_MERCHANT_API_KEY` ကို production တွင် ဖြည့်ပေးရန် လိုအပ်သည်။
2. **Phone number match**: Parking ရှိ ဖုန်းနံပါတ်နှင့် wallet အကောင့် ဖုန်းနံပါတ် တူညီရမည်။
3. **OTP**: OTP ကို parking API မှ ဘယ်တော့မှ ပြန်မပို့ပါ — Wallet စနစ်က ဖောက်သည်၏ ဖုန်းနံပါတ်သို့ SMS ဖြင့် ပို့သည်။
4. **PENDING cleanup**: ငွေမပေးရသေးသော PENDING session/subscription များကို admin မှ toggle လုပ်၍ စီမံနိုင်သည်။
5. **Migration**: Parking DB တွင် `b7c2a91f4e12` (payments table + owner_subscriptions) နှင့် `b52fe6a6f933` (payments မှ otp_code ကော်လံ ဖျက်ခြင်း) migration နှစ်ခုလုံး apply ထားရမည်။
