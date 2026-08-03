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
│  (FastAPI / Python) │      │  (Laravel)                   │
└──────────┬──────────┘      └──────────┬───────────────────┘
           │                            │
   Customer FE / Management FE    Wallet Admin FE (Top-ups)
```

- **Parking System (FastAPI)** — ငွေပေးချေရန် wallet သို့ တောင်းဆိုမှု (initiate) နှင့် အတည်ပြုမှု (confirm) ကို ခေါ်ဆိုသည်။
- **Wallet System (Laravel)** — ပိုက်ဆံအိတ် လက်ကျန်ကို စီမံပြီး OTP + PIN ဖြင့် ငွေပေးချေမှုကို အတည်ပြုပေးသည်။
- ငွေပေးချေမှု အတည်ပြုပြီးမှသာ parking session / subscription ကို **ACTIVE** ပြုလုပ်ပေးသည်။

---

## ၂။ ငွေလက်ခံသူ အကောင့်များ (Receiver Wallet Accounts)

ငွေလက်ခံမည့် အကောင့်များကို သတ်မှတ်ရန် **Wallet Account** စနစ် အသစ် ထည့်သွင်းထားသည်။

| အကောင့် | မည်သူ စီမံ | မည့်သူများ၏ ငွေကို လက်ခံသည် |
|---|---|---|
| **Platform Account** (`owner_id = NULL`) | Admin — `/api/v1/wallet-accounts/platform` | Owner များ၏ **subscription အခကြေးငွေ** |
| **Owner Account** (`owner_id` ပါ) | Owner — `/api/v1/wallet-accounts/me` | Customer များ၏ **parking session အခကြေးငွေ** |

- အကောင့်တစ်ခုစီတွင် digital wallet backend တွင် မှတ်ပုံတင်ထားသော External System ၏ **`X-API-Key`** ကို ထည့်သွင်းရသည်။
- ထို External System သည် agent wallet တစ်ခုနှင့် ချိတ်ဆက်ထားပြီး ထို wallet သို့ ငွေကျလက်ခံသည်။
- **Admin** နှင့် **Parking Owner** တစ်ဦးချင်းစီသည် မိမိတို့၏ ကိုယ်ပိုင် API key ကို သုံး၍ မိမိတို့၏
  ငွေလက်ခံအကောင့်ကို ကိုယ်တိုင် ထည့်သွင်း / ပြင်ဆင် / ပိတ် / ဖျက်နိုင်သည်။

### Wallet Account API Endpoints

| Method | Endpoint | Role | အဓိပ္ပါယ် |
|---|---|---|---|
| `GET` | `/api/v1/wallet-accounts/me` | Owner | မိမိ၏ ငွေလက်ခံအကောင့် (မရှိပါက 404) |
| `POST` | `/api/v1/wallet-accounts/me` | Owner | ငွေလက်ခံအကောင့် ဖန်တီး |
| `PUT` | `/api/v1/wallet-accounts/me` | Owner | ပြင်ဆင် (name / wallet_phone / api_key / is_active) |
| `DELETE` | `/api/v1/wallet-accounts/me` | Owner | ဖျက် |
| `GET` | `/api/v1/wallet-accounts/platform` | Admin | Platform ငွေလက်ခံအကောင့် (မရှိပါက 404) |
| `POST` | `/api/v1/wallet-accounts/platform` | Admin | Platform အကောင့် ဖန်တီး |
| `PUT` | `/api/v1/wallet-accounts/platform` | Admin | Platform အကောင့် ပြင်ဆင် |
| `DELETE` | `/api/v1/wallet-accounts/platform` | Admin | Platform အကောင့် ဖျက် |
| `GET` | `/api/v1/wallet-accounts` | Admin | အကောင့်အားလုံး (owner info + masked key) |

> Owner ငွေပေးချေရန် ငွေလက်ခံအကောင့် မရှိပါက customer က ငွေမပေးနိုင်ပါ (400 error)။
> Platform အကောင့် မရှိပါက owner က subscription ငွေမပေးနိုင်ပါ (400 error)။
> API key ကို အခြားသူများမြင်ရခြင်းမှ ကာကွယ်ရန် list API များတွင် masked ပြ၍သာ ပြသည်။

---

## ၃။ Parking API (smart-parking-api) တွင် ထည့်သွင်းထားသော အချက်များ

### ၃.၁ Model — `Payment`

| ကော်လံ | အဓိပ္ပါယ် |
|---|---|
| `user_id` | ငွေပေးချေသူ သုံးစွဲသူ |
| `session_id` / `subscription_id` | ပေးချေမှုနှင့် သက်ဆိုင်သော session / subscription |
| `wallet_account_id` | ငွေလက်ခံမည့် WalletAccount (owner / platform) |
| `wallet_payment_reference` | Wallet စနစ်မှ ပြန်လာသော payment reference |
| `wallet_transaction_number` | အတည်ပြုပြီးနောက် wallet မှ transaction number |
| `amount` / `fee` / `total` | စရိတ် / wallet အခကြေးငွေ / စုစုပေါင်း |
| `reference` | `PP-XXXXXXX` ပုံစံ ထူးခြားသော ကိုးကားနံပါတ် |
| `status` | `PENDING` → `COMPLETED` / `FAILED` / `EXPIRED` |

### ၃.၂ ငွေပေးချေ API Endpoints

**Parking Session (Customer → Owner wallet account)**

| Method | Endpoint | အဓိပ္ပါယ် |
|---|---|---|
| `POST` | `/api/v1/parking-sessions/book` | PENDING session ဖန်တီးသည် (fee တွက်ပေးသည်) |
| `POST` | `/api/v1/parking-sessions/{id}/pay/initiate` | wallet payment တောင်းဆိုသည် (OTP ကို ဖုန်းသို့ SMS ပို့သည်) |
| `POST` | `/api/v1/parking-sessions/{id}/pay/confirm` | OTP + PIN ဖြင့် အတည်ပြုသည် → session **ACTIVE** |
| `PATCH` | `/api/v1/parking-sessions/{id}/finish` | Session ပြီးဆုံးစေသည် |

**Subscription (Owner / Admin → Platform wallet account)**

| Method | Endpoint | အဓိပ္ပါယ် |
|---|---|---|
| `POST` | `/api/v1/subscriptions/purchase` | PENDING subscription ဖန်တီးသည် |
| `POST` | `/api/v1/subscriptions/renew` | PENDING renewal ဖန်တီးသည် (ယခင် expiry မှ ဆက်ရေတွက်သည်) |
| `POST` | `/api/v1/subscriptions/{id}/pay/initiate` | wallet payment တောင်းဆိုသည် (OTP ကို ဖုန်းသို့ SMS ပို့သည်) |
| `POST` | `/api/v1/subscriptions/{id}/pay/confirm` | OTP + PIN အတည်ပြုသည် → subscription **ACTIVE** |

### ၃.၃ `pay/initiate` Request Body (optional)

```json
{
  "wallet_phone": "+959000000001"
}
```

- မပို့ပါက payer ၏ ပရိုဖိုင် ဖုန်းနံပါတ်ကို အသုံးပြုသည်။

### ၃.၄ `pay/confirm` Request Body

```json
{
  "otp_code": "123456",
  "pin": "1234"
}
```

### ၃.၅ Config (`.env`)

```
WALLET_API_BASE_URL=https://smart-wallet-api-vm58.onrender.com
WALLET_REFERENCE_PREFIX=PP
```

> API key သည် **တစ်ခုလုံးအတွက် တစ်ခုတည်း** မဟုတ်တော့ဘဲ WalletAccount တစ်ခုစီတွင် သိမ်းထားသည်။
> ထို့ကြောင့် ယခင် `WALLET_PARTNER_API_KEY` / `WALLET_MERCHANT_API_KEY` ကို ဖယ်ရှားထားသည်။

### ၃.၆ အခြေအနေ (Status) စည်းမျဉ်းများ

- **Session**: `book` → `PENDING` → (pay confirm) → `ACTIVE` → (finish) → `FINISHED`
  - PENDING session ကို `finish` မလုပ်နိုင်ပါ (400 error)။
  - ACTIVE ဖြစ်ပြီးသား session ကို ပြန်ပေးချေ၍ မရပါ။
- **Subscription**: `purchase` / `renew` → `PENDING` → (pay confirm) → `ACTIVE`
  - ငွေမပေးရသေးသော (PENDING) subscription ဖြင့် parking lot ဖန်တီး၍ မရပါ (403 error)။
  - Renewal ကို ပေးချေပြီးပါက ယခင် ACTIVE subscription ၏ expiry နေ့မှ ဆက်၍ တွက်သည်။

### ၃.၇ ဖုန်းနံပါတ် လိုအပ်ချက်

- Customer ငွေပေးချေရန် သူ၏ ပရိုဖိုင်တွင် ဖုန်းနံပါတ် ထည့်ထားရမည် (`PUT /api/v1/auth/me` မှတစ်ဆင့်)
  သို့မဟုတ် `pay/initiate` body တွင် `wallet_phone` ပို့နိုင်သည်။
- ဖုန်းနံပါတ် မရှိပါက "A phone number is required to pay with your wallet" error ပြန်သည်။
- ထို ဖုန်းနံပါတ်အတိုင်း wallet အကောင့် (Digital Wallet စနစ်တွင်) ရှိရမည်။

---

## ၄။ Wallet System (digital-wallet-backend-api — Laravel) External API

### ၄.၁ External Payment (External System API key ဖြင့်)

| Method | Endpoint | Body | ရလဒ် |
|---|---|---|---|
| `POST` | `/api/external/payments/initiate` | `customer_phone`, `amount`, `order_reference`, `description` | `payment_reference`, `amount`, `fee`, `total` |
| `POST` | `/api/external/payments/confirm` | `payment_reference`, `otp`, `pin` | အောင်မြင်ပါက `transaction_number` |

Header: `X-API-Key: <external system key>`

> Parking API သည် initiate/confirm ခေါ်တိုင်း သက်ဆိုင်ရာ WalletAccount ၏ `api_key` ကို header အဖြစ်ထည့်ပို့သည်။
> OTP ကို initiate API မှ ပြန်မပို့ပါ — Wallet စနစ်က ဖောက်သည်၏ ဖုန်းနံပါတ်သို့ SMS ဖြင့် တိုက်ရိုက် ပို့သည်။

### ၄.၂ External System စီမံခန့်ခွဲမှု

| Method | Endpoint | Role | အဓိပ္ပါယ် |
|---|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/external-systems` | Admin | External System (API key + agent wallet ချိတ်ဆက်) စီမံ |
| `GET` | `/api/wallets/topups` | Admin | Top-up စာရင်း |
| `POST` | `/api/wallets/topups/{id}/approve` | Admin | Top-up အတည်ပြုပြီး wallet သို့ ငွေထည့် |

---

## ၅။ Frontend အပြောင်းအလဲများ

### ၅.၁ Customer App (`smart-parking-customer`)

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
- `WalletPaymentOut` တွင် `wallet_payment_reference` / `wallet_transaction_number` ကိုသုံးသည်။

### ၅.၂ Management App (`smart-parking-management`)

- **Admin Payments Page** (`src/pages/admin/PaymentsPage.tsx`) — `/admin/payments`
  - Platform wallet account ဖန်တီး / ပြင်ဆင် / activate-deactivate / ဖျက်။
  - Owner အကောင့်အားလုံး (masked key + owner info) စာရင်း။
- **Owner Wallet Account Page** (`src/pages/owner/WalletPage.tsx`) — `/owner/wallet`
  - Owner က မိမိ၏ ငွေလက်ခံအကောင့်ကို ဖန်တီး / ပြင်ဆင် / activate-deactivate / ဖျက်။
- **Owner Subscription Page** (`src/pages/owner/SubscriptionPage.tsx`)
  - ယခင်က payment method ရွေးချယ်မှု / QR / transaction ref များ ဖယ်ရှားပြီး **wallet ငွေပေးချေမှု** အစားထိုးထားသည်။
  - Modal flow: Confirm → PENDING subscription → initiate (OTP) → OTP+PIN → pay → ACTIVE
- **Type** (`src/types/index.ts`) — `WalletAccountOut`, `WalletPaymentOut` အသစ်နှင့် ကိုက်ညီအောင် ပြင်ထားသည်။

---

## ၆။ Testing

| စနစ် | Command | ရလဒ် |
|---|---|---|
| Parking API | `./venv/bin/python -m pytest -q` | 37 passed |

- Parking tests တွင် `FakeWalletClient` ကို အသုံးပြုသည် (OTP `123456`, fee 1%)။
- Test fixture သည် Platform wallet account တစ်ခုကို auto-create ပြုလုပ်ပေးသည်။
- Owner အတွက် ငွေလက်ခံအကောင့် ဖန်တီးခြင်းကို `create_owner_wallet` helper ဖြင့် လုပ်သည်။
- Parking API မှ OTP ပြန်မပို့တော့ပါ — tests တွင် `123456` ကို တိုက်ရိုက် hardcode ထားသည်။

---

## ၇။ သတိပြုရမည့် အချက်များ

1. **Receiver API keys**: Admin နှင့် Owner တစ်ဦးချင်းစီသည် digital wallet backend တွင် မိမိတို့၏
   External System အတွက် မှတ်ပုံတင်ထားသော `X-API-Key` ကို Wallet Account တွင် ထည့်သွင်းရမည်။
   ထို External System က agent wallet နှင့် ချိတ်ဆက်ထားရမည်။
2. **Phone number match**: Parking ရှိ ဖုန်းနံပါတ်နှင့် wallet အကောင့် ဖုန်းနံပါတ် တူညီရမည်။
3. **OTP**: OTP ကို parking API မှ ဘယ်တော့မှ ပြန်မပို့ပါ — Wallet စနစ်က ဖောက်သည်၏ ဖုန်းနံပါတ်သို့ SMS ဖြင့် ပို့သည်။
4. **PENDING cleanup**: ငွေမပေးရသေးသော PENDING session/subscription များကို admin မှ toggle လုပ်၍ စီမံနိုင်သည်။
5. **Migration**: Parking DB တွင် `c8a1d3f5b9e2` (wallet_accounts table + payments ကော်လံအသစ်များ) migration ကို
   ယခင် `b7c2a91f4e12`၊ `b52fe6a6f933` များနှင့်အတူ apply ထားရမည်။
