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
    "common.open": "Open",
    "common.closed": "Closed",

    // Home / Landing
    "home.hero_badge": "Myanmar's Smart Parking Platform",
    "home.hero_title_1": "Park Smarter,",
    "home.hero_title_2": "Drive Faster",
    "home.hero_subtitle": "Find, reserve, and manage your vehicle parking easily across Myanmar.",
    "home.get_started": "Get Started Free",
    "home.find_parking": "Find Parking Lots",
    "home.active_lots": "Active Parking Lots",
    "home.nearby_lots": "Parking Lots in Myanmar",
    "home.why_smart": "Why Smart Parking?",
    "home.why_subtitle": "Everything you need for seamless vehicle parking in Myanmar.",
    "home.how_it_works": "Park in 4 simple steps",
    "home.step1_title": "Register & Add Vehicle",
    "home.step1_desc": "Create your account and register your vehicle plate number in seconds.",
    "home.step2_title": "Find a Parking Lot",
    "home.step2_desc": "Browse available parking lots in Myanmar and check real-time slot availability.",
    "home.step3_title": "Book Your Slot",
    "home.step3_desc": "Select your preferred slot, set your parking schedule, and proceed to payment.",
    "home.step4_title": "Pay & Park",
    "home.step4_desc": "Complete payment via digital wallet and your session goes live instantly.",
    "home.cta_title": "Ready to park smarter?",
    "home.cta_subtitle": "Join thousands of drivers using Smart Parking to save time and money in Myanmar.",
    "home.create_account": "Create Free Account",
    "home.login_instead": "Log in instead",

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
    "common.open": "ဖွင့်ထားသည်",
    "common.closed": "ပိတ်ထားသည်",

    // Home / Landing
    "home.hero_badge": "မြန်မာနိုင်ငံ စမတ် ယာဉ်ရပ်နားစခန်း စနစ်",
    "home.hero_title_1": "လွယ်ကူစွာ ရပ်နားပါ၊",
    "home.hero_title_2": "အချိန်ကုန် သက်သာပါ",
    "home.hero_subtitle": "မြန်မာနိုင်ငံအတွင်း ယာဉ်ရပ်နားရန် နေရာများကို လွယ်ကူစွာ ရှာဖွေ၊ ကြိုတင် ရပ်နား၊ စီမံခန့်ခွဲနိုင်ပါသည်။",
    "home.get_started": "စတင် အသုံးပြုမည်",
    "home.find_parking": "စခန်းများ ရှာဖွေမည်",
    "home.active_lots": "ဖွင့်လှစ်ထားသော စခန်းများ",
    "home.nearby_lots": "မြန်မာနိုင်ငံအတွင်းရှိ ယာဉ်ရပ်နားစခန်းများ",
    "home.why_smart": "စမတ် ယာဉ်ရပ်နားစနစ်၏ အားသာချက်များ",
    "home.why_subtitle": "မြန်မာနိုင်ငံအတွင်း စနစ်တကျ လွယ်ကူစွာ ယာဉ်ရပ်နားနိုင်မည့် ဝန်ဆောင်မှုများ",
    "home.how_it_works": "အဆင့် ၄ ဆင့်ဖြင့် လွယ်ကူစွာ ရပ်နားပါ",
    "home.step1_title": "အကောင့်ဖွင့်ပြီး ယာဉ်ထည့်သွင်းပါ",
    "home.step1_desc": "စက္ကန့်ပိုင်းအတွင်း အကောင့်ဖွင့်ပြီး သင့်ယာဉ်၏ လိုင်စင်နံပါတ်ကို ထည့်သွင်းပါ။",
    "home.step2_title": "ယာဉ်ရပ်နားစခန်း ရှာဖွေပါ",
    "home.step2_desc": "မြန်မာနိုင်ငံအတွင်းရှိ စခန်းများနှင့် လွတ်လပ်သော နေရာများကို တိုက်ရိုက် ကြည့်ရှုပါ။",
    "home.step3_title": "နေရာ ရွေးချယ် ကြိုတင်မှာယူပါ",
    "home.step3_desc": "စိတ်ကြိုက် နေရာနှင့် ရပ်နားမည့် အချိန်ဇယားကို ရွေးချယ်ပါ။",
    "home.step4_title": "ငွေချေပြီး စတင်ရပ်နားပါ",
    "home.step4_desc": "ဒစ်ဂျစ်တယ် ပိုက်ဆံအိတ်ဖြင့် လွယ်ကူစွာ ငွေချေပြီး ချက်ချင်း စတင် ရပ်နားပါ။",
    "home.cta_title": "စမတ်ကျကျ ရပ်နားရန် အသင့်ဖြစ်ပြီလား?",
    "home.cta_subtitle": "မြန်မာနိုင်ငံအတွင်း အချိန်နှင့် ငွေကြေး သက်သာစေရန် Smart Parking ကို အသုံးပြုလိုက်ပါ။",
    "home.create_account": "အကောင့် အခမဲ့ဖွင့်မည်",
    "home.login_instead": "အကောင့်ရှိပြီးပါက ဝင်ရန်",

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
  language: (localStorage.getItem("app_language") as Language) || "mm",
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
