/**
 * Kayin State (ကရင်ပြည်နယ်) — all townships / major cities.
 * Used as filter options across the parking lot listing pages.
 */

export interface KayinCity {
  value: string     // used as API query param
  label: string     // English name
  labelMm: string   // Myanmar script name
}

export const Kayin_STATE_CITIES: KayinCity[] = [
  { value: "Hpa-an", label: "Hpa-an", labelMm: "ဘားအံ" },
  { value: "Myawaddy", label: "Myawaddy", labelMm: "မြဝတီ" },
  { value: "Kawkareik", label: "Kawkareik", labelMm: "ကော့ကရိတ်" },
  { value: "Kyainseikgyi", label: "Kyainseikgyi", labelMm: "ကျိုင်းဆိုင်ကြီး" },
  { value: "Hlaingbwe", label: "Hlaingbwe", labelMm: "လှိုင်းဘွဲ့" },
  { value: "Thandaunggyi", label: "Thandaunggyi", labelMm: "သံတောင်ကြီး" },
  { value: "Htantabin", label: "Htantabin", labelMm: "ထန်းတပင်" },
  { value: "Papun", label: "Papun", labelMm: "ဖာပွန်" },
  { value: "Payathonzu", label: "Payathonzu", labelMm: "ဘုရားသုံးဆူ" },
  { value: "Waw", label: "Waw", labelMm: "ဝေါ" },
  { value: "Ler Mu Plaw", label: "Ler Mu Plaw", labelMm: "လာမူပလော" },
]

export const Kayin_STATE_CITY_VALUES = Kayin_STATE_CITIES.map((c) => c.value)

export function getKayinCityLabel(value: string, lang: "en" | "mm" = "en"): string {
  const city = Kayin_STATE_CITIES.find((c) => c.value === value)
  if (!city) return value
  return lang === "mm" ? city.labelMm : city.label
}

// Backward compatible aliases
export const KAREN_STATE_CITIES = Kayin_STATE_CITIES
export const KAREN_STATE_CITY_VALUES = Kayin_STATE_CITY_VALUES
export const getKarenCityLabel = getKayinCityLabel
