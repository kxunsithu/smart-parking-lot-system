import { create } from "zustand";

export type Language = "en" | "mm";

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Roles
    "nav.dashboard": "Dashboard",
    "nav.users": "User Management",
    "nav.packages": "Subscription Packages",
    "nav.subscriptions": "Subscriptions",
    "nav.lots": "Parking Lots",
    "nav.floors": "Floors & Slots",
    "nav.staff": "Staff Management",
    "nav.wallet": "Wallet Setup",
    "nav.profile": "Profile & Settings",
    "nav.check_in": "Gate Check-In",
    "nav.check_out": "Gate Check-Out",
    "nav.live_slots": "Live Slot Grid",
    "nav.active_sessions": "Active Sessions",
    "nav.logout": "Log Out",

    // Role Headers
    "role.admin": "System Administrator",
    "role.owner": "Parking Lot Owner",
    "role.staff": "Parking Staff",

    // Common Actions & UI
    "common.search": "Search...",
    "common.filter": "Filter",
    "common.all": "All",
    "common.actions": "Actions",
    "common.status": "Status",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.pending": "Pending",
    "common.completed": "Completed",
    "common.expired": "Expired",
    "common.cancelled": "Cancelled",
    "common.available": "Available",
    "common.occupied": "Occupied",
    "common.save": "Save Changes",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.create": "Create New",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.refresh": "Refresh Data",
    "common.total_revenue": "Total Revenue",
    "common.total_lots": "Total Lots",
    "common.total_owners": "Total Owners",
    "common.occupancy": "Occupancy Rate",
    "common.mmk": "MMK",

    // Gate & Check-in / Check-out
    "gate.vehicle_plate": "Vehicle Plate Number",
    "gate.select_slot": "Select Available Slot",
    "gate.check_in_btn": "Complete Check-In",
    "gate.check_out_btn": "Process Check-Out & Payment",
    "gate.duration": "Parking Duration",
    "gate.total_fee": "Total Fee Due",
    "gate.payment_method": "Payment Method",
    "gate.cash": "Cash",
    "gate.digital_wallet": "Digital Wallet",
  },

  mm: {
    // Navigation & Roles
    "nav.dashboard": "ဒက်ရှ်ဘုတ်",
    "nav.users": "သုံးစွဲသူများ စီမံခန့်ခွဲခြင်း",
    "nav.packages": "ဝန်ဆောင်မှု ပက်ကေ့ဂျ်များ",
    "nav.subscriptions": "ပိုင်ရှင် သက်တမ်း စာရင်းများ",
    "nav.lots": "ယာဉ်ရပ်နားစခန်းများ",
    "nav.floors": "အထပ်နှင့် နေရာများ",
    "nav.staff": "ဝန်ထမ်းများ စီမံခန့်ခွဲခြင်း",
    "nav.wallet": "ဒစ်ဂျစ်တယ် ပိုက်ဆံအိတ်",
    "nav.profile": "ပရိုဖိုင်နှင့် ဆက်တင်များ",
    "nav.check_in": "ယာဉ်အဝင် လက်ခံရန်",
    "nav.check_out": "ယာဉ်အထွက် ငွေရှင်းရန်",
    "nav.live_slots": "နေရာများ အခြေအနေ ပြဇယား",
    "nav.active_sessions": "လက်ရှိ ရပ်နားထားသော ယာဉ်များ",
    "nav.logout": "အကောင့်ထွက်ရန်",

    // Role Headers
    "role.admin": "စနစ်စီမံခန့်ခွဲသူ (Admin)",
    "role.owner": "ယာဉ်ရပ်နားစခန်း ပိုင်ရှင် (Owner)",
    "role.staff": "စခန်း တာဝန်ကျ ဝန်ထမ်း (Staff)",

    // Common Actions & UI
    "common.search": "ရှာဖွေရန်...",
    "common.filter": "စစ်ထုတ်ရန်",
    "common.all": "အားလုံး",
    "common.actions": "လုပ်ဆောင်ချက်များ",
    "common.status": "အခြေအနေ",
    "common.active": "ဖွင့်ထားသည်",
    "common.inactive": "ပိတ်ထားသည်",
    "common.pending": "စောင့်ဆိုင်းဆဲ",
    "common.completed": "ပြီးမြောက်သည်",
    "common.expired": "သက်တမ်းကုန်ပြီ",
    "common.cancelled": "ပယ်ဖျက်ပြီး",
    "common.available": "လွတ်သည်",
    "common.occupied": "ပြည့်နေသည်",
    "common.save": "သိမ်းဆည်းမည်",
    "common.cancel": "မလုပ်တော့ပါ",
    "common.confirm": "အတည်ပြုမည်",
    "common.create": "အသစ် ဖန်တီးမည်",
    "common.edit": "ပြင်ဆင်မည်",
    "common.delete": "ဖျက်မည်",
    "common.refresh": "ပြန်လည်ရယူမည်",
    "common.total_revenue": "စုစုပေါင်း ဝင်ငွေ",
    "common.total_lots": "စခန်း အရေအတွက်",
    "common.total_owners": "ပိုင်ရှင် အရေအတွက်",
    "common.occupancy": "ယာဉ်ရပ်နားထားမှု ရာခိုင်နှုန်း",
    "common.mmk": "ကျပ်",

    // Gate & Check-in / Check-out
    "gate.vehicle_plate": "ယာဉ်အမှတ် (လိုင်စင်နံပါတ်)",
    "gate.select_slot": "လွတ်လပ်သော နေရာ ရွေးချယ်ပါ",
    "gate.check_in_btn": "ယာဉ်အဝင် အတည်ပြုမည်",
    "gate.check_out_btn": "ယာဉ်အထွက် ငွေရှင်းမည်",
    "gate.duration": "ရပ်နားခဲ့သည့် ကြာမြင့်ချိန်",
    "gate.total_fee": "ကျသင့်သည့် ငွေပမာဏ",
    "gate.payment_method": "ငွေချေစနစ်",
    "gate.cash": "ငွေသား",
    "gate.digital_wallet": "ဒစ်ဂျစ်တယ် ပိုက်ဆံအိတ်",
  },
};

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

export const useLanguage = create<LanguageState>((set, get) => ({
  language: (localStorage.getItem("app_language") as Language) || "en",
  setLanguage: (lang: Language) => {
    localStorage.setItem("app_language", lang);
    set({ language: lang });
  },
  toggleLanguage: () => {
    const current = get().language;
    const next = current === "en" ? "mm" : "en";
    localStorage.setItem("app_language", next);
    set({ language: next });
  },
  t: (key: string, fallback?: string) => {
    const lang = get().language;
    return translations[lang]?.[key] || fallback || key;
  },
}));
