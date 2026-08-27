# Conceptual Class Diagram ရှင်းလင်းချက် (မြန်မာဘာသာ)

> ဤစာတမ်းသည် Smart Parking Lot System ၏ Conceptual Class Diagram ကို မြန်မာဘာသာဖြင့် ရှင်းလင်းဖော်ပြသည်။

---

## ၁။ Class များ အကျဉ်းချုပ်

| Class နာမည် | အဓိပ္ပာယ် | ဒေတာဘေ့စ် ဇယား |
|---|---|---|
| `User` | စနစ်တွင် အကောင့်ဖွင့်ထားသော သုံးစွဲသူ | `users` |
| `Role` | သုံးစွဲသူ၏ ရာထူး (ADMIN / OWNER / STAFF / CUSTOMER) | `roles` |
| `Customer` | ယာဉ်ရပ်နားခန်း ငှားရမ်းသော ယာဉ်မောင်း သုံးစွဲသူ | `customers` |
| `Car` | Customer ၏ ပိုင်ဆိုင်သော မော်တော်ယာဉ် | `cars` |
| `ParkingOwner` | ယာဉ်ရပ်နားစခန်း ပိုင်ဆိုင်သော ပိုင်ရှင် | `parking_owners` |
| `ParkingStaff` | ယာဉ်ရပ်နားစခန်းတွင် တာဝန်ကျသော ဝန်ထမ်း | `parking_staff` |
| `ParkingLot` | ယာဉ်ရပ်နားစခန်း တစ်ခုလုံး | `parking_lots` |
| `ParkingFloor` | ယာဉ်ရပ်နားစခန်း၏ အထပ် တစ်ထပ် | `parking_floors` |
| `ParkingSlot` | အထပ်တစ်ထပ်တွင်ပါဝင်သော ယာဉ်ရပ်နားနေရာ တစ်နေရာ | `parking_slots` |
| `ParkingSession` | ယာဉ် တစ်စီး ရပ်နားနေသော ကာလ မှတ်တမ်း | `parking_sessions` |
| `Package` | ပိုင်ရှင်များ ဝယ်ယူနိုင်သော ဝန်ဆောင်မှု ပက်ကေ့ဂျ် | `packages` |
| `OwnerSubscription` | ပိုင်ရှင်တစ်ဦး ဝယ်ယူထားသော ပက်ကေ့ဂျ် မှတ်တမ်း | `owner_subscriptions` |
| `WalletAccount` | ဒစ်ဂျစ်တယ် ပိုက်ဆံအိတ် ငွေလက်ခံသည့် အကောင့် | `wallet_accounts` |
| `Payment` | ငွေပေးချေမှု မှတ်တမ်း (Session / Subscription) | `payments` |

---

## ၂။ ဆက်ဆံရေး (Relationships) အသေးစိတ်

### ၂.၁ Role ↔ User
```
Role (1) ──── (0..*) User
```
- Role တစ်ခုတွင် User များစွာ ရှိနိုင်သည်
- User တစ်ဦးသည် Role တစ်ခုသာ ရှိသည် (ADMIN, OWNER, STAFF, CUSTOMER)
- ဥပမာ — `OWNER` ရာထူးရှိ User တစ်ဦးသည် ParkingOwner ဖြစ်သည်

---

### ၂.၂ User ↔ Customer
```
User (1) ──── (0..1) Customer
```
- User တစ်ဦးသည် Customer Profile ရှိနိုင်သည် (မဖြစ်မနေ မဟုတ်)
- Customer ၏ ရာထူးသည် `CUSTOMER` ဖြစ်ရမည်

---

### ၂.၃ Customer ↔ Car
```
Customer (1) ──── (0..*) Car
```
- Customer တစ်ဦးသည် ယာဉ် တစ်စီး သို့မဟုတ် များစွာ မှတ်ပုံတင်နိုင်သည်
- ယာဉ်တစ်စီးသည် Customer တစ်ဦးနှင့်သာ ချိတ်ဆက်သည်

---

### ၂.၄ User ↔ ParkingOwner
```
User (1) ──── (0..1) ParkingOwner
```
- User တစ်ဦးသည် ParkingOwner Profile ရှိနိုင်သည်
- ParkingOwner ၏ ရာထူးသည် `OWNER` ဖြစ်ရမည်

---

### ၂.၅ ParkingOwner ↔ ParkingStaff
```
ParkingOwner (1) ──── (0..*) ParkingStaff
```
- ပိုင်ရှင်တစ်ဦးသည် ဝန်ထမ်း တစ်ဦး သို့မဟုတ် များစွာ ခန့်အပ်နိုင်သည်
- ဝန်ထမ်းတစ်ဦးသည် ပိုင်ရှင်တစ်ဦး (မိမိကို ခန့်အပ်သူ) နှင့်သာ ဆက်သွယ်သည်

---

### ၂.၆ ParkingOwner ↔ ParkingLot
```
ParkingOwner (1) ──── (0..*) ParkingLot
```
- ပိုင်ရှင်တစ်ဦးသည် ယာဉ်ရပ်နားစခန်း တစ်ခု သို့မဟုတ် များစွာ ပိုင်ဆိုင်နိုင်သည်
- ပက်ကေ့ဂျ်၏ `max_lots` ကန့်သတ်ချက်ဖြင့် ထိန်းချုပ်သည်

---

### ၂.၇ ParkingStaff ↔ ParkingLot
```
ParkingLot (1) ──── (0..*) ParkingStaff
```
- ယာဉ်ရပ်နားစခန်းတစ်ခုတွင် ဝန်ထမ်း တစ်ဦး သို့မဟုတ် များစွာ တာဝန်ကျနိုင်သည်
- ဝန်ထမ်းတစ်ဦးသည် စခန်းတစ်ခုတွင်သာ တာဝန်ကျသည်

---

### ၂.၈ ParkingLot → ParkingFloor → ParkingSlot
```
ParkingLot (1) ──── (0..*) ParkingFloor (1) ──── (0..*) ParkingSlot
```
- ယာဉ်ရပ်နားစခန်းတွင် အထပ်များ (မြေညီထပ်၊ ပထမထပ် စသည်) ရှိနိုင်သည်
- အထပ်တစ်ထပ်တွင် ယာဉ်ရပ်နားနေရာများ (Slot A-1, A-2 စသည်) ရှိသည်
- ဤ ဆင့်ဆင့် ဆက်ဆံမှုဖြင့် **3D/2D Layout** ကို ဖန်တီးသည်

---

### ၂.၉ ParkingSlot ↔ ParkingSession
```
ParkingSlot (1) ──── (0..*) ParkingSession
Car (1) ──── (0..*) ParkingSession
```
- ယာဉ်ရပ်နားနေရာတစ်ခုတွင် ရပ်နားမှု Sessions များစွာ (မတူညီသောအချိန်ကာလ) ရှိနိုင်သည်
- ယာဉ်တစ်စီးသည် Sessions များစွာ ရပ်နားနိုင်သည် (မတူသောအချိန်)
- Session တစ်ခုတွင် **ကြာမြင့်ချိန်**၊ **ကျသင့်ငွေ**၊ **အခြေအနေ** (ACTIVE / FINISHED) တို့ မှတ်တမ်းတင်သည်

---

### ၂.၁၀ Package ↔ OwnerSubscription
```
Package (1) ──── (0..*) OwnerSubscription
ParkingOwner (1) ──── (0..*) OwnerSubscription
```
- Package တစ်ခုကို ပိုင်ရှင်များ ဝယ်ယူ (Subscribe) နိုင်သည်
- OwnerSubscription သည် "ဘယ်ပိုင်ရှင်က ဘယ် Package ကို ဘယ်ရက်က ဝယ်ထားသည်" ဆိုသော မှတ်တမ်းဖြစ်သည်
- Package ဥပမာများ — Basic (2 lots, 2 staff), Pro (5 lots, 10 staff), Enterprise (unlimited)

---

### ၂.၁၁ Payment ↔ OwnerSubscription
```
Payment (1) ──── (1) OwnerSubscription
```
- OwnerSubscription တစ်ခု ဝယ်ယူသောအခါ Payment မှတ်တမ်း တစ်ခု ဖန်တီးသည်
- **ငွေသွားလမ်းကြောင်း** — ပိုင်ရှင်၏ ပိုက်ဆံအိတ် → Admin ပလက်ဖောင်း ပိုက်ဆံအိတ်

---

### ၂.၁၂ WalletAccount ↔ ParkingOwner / User
```
User (1) ──── (0..*) WalletAccount
WalletAccount (1) ──── (0..*) Payment
```
- ParkingOwner တစ်ဦးသည် WalletAccount (ငွေလက်ခံ API Key) တစ်ခု သတ်မှတ်နိုင်သည်
- Admin ကလည်း Platform WalletAccount တစ်ခု သတ်မှတ်သည် (Subscription ငွေ လက်ခံရန်)
- Payment တစ်ခုပြုလုပ်ပါက ထို WalletAccount မှ ငွေ လက်ခံသည်

---

### ၂.၁၃ Payment ↔ ParkingSession
```
Payment (0..1) ──── (1) ParkingSession
```
- Session ငွေပေးချေမှု တစ်ခုပြုလုပ်ပါက Payment မှတ်တမ်း ဖန်တီးသည်
- **ငွေသွားလမ်းကြောင်း** — Customer ပိုက်ဆံအိတ် → ParkingOwner ပိုက်ဆံအိတ်
- Session တစ်ခုတွင် Payment မရှိသောနည်းလမ်း (ငွေသား) ဖြင့်လည်း ဆောင်ရွက်နိုင်သည်

---

## ၃။ ငွေပေးချေမှု လမ်းကြောင်း (Payment Flows)

```
Customer ────[Book Session]────► ParkingSession
    │                                  │
    │   DigitalWallet Payment           │
    └──────────────────────────────────►Payment──►WalletAccount (Owner)

ParkingOwner ──[Buy Package]──► OwnerSubscription
    │                                  │
    │   DigitalWallet Payment           │
    └──────────────────────────────────►Payment──►WalletAccount (Admin)
```

| ငွေပေးချေမှု အမျိုးအစား | ငွေပေးသူ | ငွေလက်ခံသူ |
|---|---|---|
| Parking Session | Customer | ParkingOwner |
| Subscription Package | ParkingOwner | Admin (Platform) |

---

## ၄။ မြင်ကွင်းချုပ် — ဆက်ဆံမှု ဇယား

```
Role ──(1:*)──► User
                 │
          ┌──────┼──────┐
          ▼      ▼      ▼
       Customer ParkingOwner (ParkingStaff မဟုတ်)
          │      │
       Car(*)  ParkingLot(*)
                 │
             ParkingFloor(*)
                 │
             ParkingSlot(*)
                 │
             ParkingSession(*) ◄── Car
                 │
              Payment ──► WalletAccount

ParkingOwner ──► OwnerSubscription ──► Package
                     │
                  Payment ──► WalletAccount (Admin)
```

---

## ၅။ အဓိက စည်းကမ်းများ (Business Rules from Diagram)

| # | စည်းကမ်း |
|---|---|
| 1 | User တစ်ဦးသည် Role တစ်ခုသာ ရှိသည် |
| 2 | OWNER ရာထူးရှိ User သာ ParkingOwner ဖြစ်နိုင်သည် |
| 3 | CUSTOMER ရာထူးရှိ User သာ Car မှတ်ပုံတင်နိုင်သည် |
| 4 | ParkingOwner တစ်ဦးသည် SubscriptionPackage မရှိလျှင် ParkingLot မဖန်တီးနိုင် |
| 5 | ParkingSlot တစ်ခုသည် ParkingFloor တစ်ခုတွင်သာ ပါဝင်သည် |
| 6 | ParkingSession တစ်ခုသည် Car တစ်စီးနှင့် ParkingSlot တစ်ခုနှင့်သာ ချိတ်ဆက်သည် |
| 7 | Session Payment သည် Owner ၏ WalletAccount သို့ ရောက်သည် |
| 8 | Subscription Payment သည် Admin ၏ WalletAccount (Platform) သို့ ရောက်သည် |

---

*ဤ Class Diagram ကို UML Conceptual Class Diagram ပုံစံဖြင့် ရေးဆွဲထားသည်။*
*ဒေတာဘေ့စ် Implementation တွင် ဖော်ပြထားသော ဆက်ဆံမှုများအတိုင်း SQLAlchemy ORM ဖြင့် ဖော်ထုတ်ထားသည်။*
