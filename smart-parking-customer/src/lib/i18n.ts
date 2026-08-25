import { create } from "zustand";

export type Language = "en" | "mm";

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.parking": "Parking Lots",
    "nav.cars": "My Vehicles",
    "nav.sessions": "Parking Sessions",
    "nav.profile": "Profile",
    "nav.login": "Log in",
    "nav.register": "Register",
    "nav.logout": "Log out",

    // Common UI
    "common.search": "Search parking lots, locations...",
    "common.filter": "Filter",
    "common.all": "All",
    "common.public": "Public",
    "common.private": "Private",
    "common.available": "Available",
    "common.occupied": "Occupied",
    "common.rate": "Rate",
    "common.hour": "hr",
    "common.mmk": "MMK",
    "common.slots": "slots",
    "common.view_3d": "3D View",
    "common.directions": "Directions",
    "common.details": "View Details",
    "common.close": "Close",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.pay": "Pay Now",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add New",

    // Home / Landing
    "home.hero_title": "Smart Parking Lot Management System",
    "home.hero_subtitle": "Find, reserve, and manage your vehicle parking easily across Yangon.",
    "home.find_parking": "Find Parking Lots",
    "home.active_lots": "Active Parking Lots",
    "home.nearby_lots": "Nearby Parking Lots in Yangon",

    // Parking Details
    "parking.floors": "Floors & Layout",
    "parking.slots_overview": "Slots Overview",
    "parking.rate_per_hour": "Hourly Rate",
    "parking.location_map": "Location Map",

    // Vehicles
    "cars.title": "My Registered Vehicles",
    "cars.add_title": "Add New Vehicle",
    "cars.plate_number": "License Plate Number",
    "cars.brand": "Brand / Model",
    "cars.color": "Color",
    "cars.no_cars": "No vehicles registered yet.",

    // Sessions
    "sessions.active_title": "Current Active Session",
    "sessions.history_title": "Parking History",
    "sessions.duration": "Duration",
    "sessions.current_fee": "Current Fee",
    "sessions.no_active": "No active parking session right now.",

    // Profile
    "profile.account": "Account Details",
    "profile.name": "Full Name",
    "profile.email": "Email Address",
    "profile.phone": "Phone Number",
    "profile.verified": "Verified Account",
    "profile.change_password": "Change Password",
  },

  mm: {
    // Navigation
    "nav.home": "ပင်မစာမျက်နှာ",
    "nav.parking": "ယာဉ်ရပ်နားစခန်းများ",
    "nav.cars": "ကျွန်ုပ်၏ ယာဉ်များ",
    "nav.sessions": "ယာဉ်ရပ်နားမှု စာရင်းများ",
    "nav.profile": "ပရိုဖိုင်",
    "nav.login": "အကောင့်ဝင်ရန်",
    "nav.register": "အကောင့်ဖွင့်ရန်",
    "nav.logout": "အကောင့်ထွက်ရန်",

    // Common UI
    "common.search": "ယာဉ်ရပ်နားစခန်း၊ မြို့နယ် ရှာဖွေရန်...",
    "common.filter": "စစ်ထုတ်ရန်",
    "common.all": "အားလုံး",
    "common.public": "အများသုံး",
    "common.private": "ကိုယ်ပိုင်",
    "common.available": "လွတ်သည်",
    "common.occupied": "ပြည့်နေသည်",
    "common.rate": "နှုန်းထား",
    "common.hour": "နာရီ",
    "common.mmk": "ကျပ်",
    "common.slots": "နေရာ",
    "common.view_3d": "3D မြင်ကွင်း",
    "common.directions": "လမ်းကြောင်းပြ",
    "common.details": "အသေးစိတ် ကြည့်မည်",
    "common.close": "ပိတ်မည်",
    "common.cancel": "မလုပ်တော့ပါ",
    "common.confirm": "အတည်ပြုမည်",
    "common.pay": "ငွေချေမည်",
    "common.save": "သိမ်းဆည်းမည်",
    "common.delete": "ဖျက်မည်",
    "common.edit": "ပြင်ဆင်မည်",
    "common.add": "အသစ်ထည့်မည်",

    // Home / Landing
    "home.hero_title": "စမတ် ယာဉ်ရပ်နားစခန်း စီမံခန့်ခွဲမှု စနစ်",
    "home.hero_subtitle": "ရန်ကုန်မြို့အတွင်း ယာဉ်ရပ်နားရန် နေရာများကို လွယ်ကူစွာ ရှာဖွေ၊ ရပ်နား၊ စီမံခန့်ခွဲနိုင်ပါသည်။",
    "home.find_parking": "စခန်းများ ရှာဖွေမည်",
    "home.active_lots": "ဖွင့်လှစ်ထားသော စခန်းများ",
    "home.nearby_lots": "ရန်ကုန်မြို့အတွင်းရှိ ယာဉ်ရပ်နားစခန်းများ",

    // Parking Details
    "parking.floors": "အထပ်များနှင့် နေရာများ",
    "parking.slots_overview": "နေရာများ အခြေအနေ",
    "parking.rate_per_hour": "တစ်နာရီ နှုန်းထား",
    "parking.location_map": "တည်နေရာ မြေပုံ",

    // Vehicles
    "cars.title": "မှတ်ပုံတင်ထားသော ယာဉ်များ",
    "cars.add_title": "ယာဉ်အသစ် ထည့်သွင်းမည်",
    "cars.plate_number": "ယာဉ်အမှတ် (လိုင်စင်နံပါတ်)",
    "cars.brand": "အမျိုးအစား / တံဆိပ်",
    "cars.color": "အရောင်",
    "cars.no_cars": "မှတ်ပုံတင်ထားသော ယာဉ် မရှိသေးပါ။",

    // Sessions
    "sessions.active_title": "လက်ရှိ ရပ်နားထားမှု",
    "sessions.history_title": "ယခင် ရပ်နားခဲ့ဖူးသော မှတ်တမ်းများ",
    "sessions.duration": "ကြာမြင့်ချိန်",
    "sessions.current_fee": "ကျသင့်နေသည့် ငွေပမာဏ",
    "sessions.no_active": "လက်ရှိ ရပ်နားထားသော ယာဉ် မရှိပါ။",

    // Profile
    "profile.account": "အကောင့် အချက်အလက်များ",
    "profile.name": "အမည်",
    "profile.email": "အီးမေးလ်",
    "profile.phone": "ဖုန်းနံပါတ်",
    "profile.verified": "အတည်ပြုပြီးသော အကောင့်",
    "profile.change_password": "စကားဝှက် ပြောင်းလဲမည်",
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
