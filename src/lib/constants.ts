export const CURRENCIES = ["EUR", "USD", "TRY"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  TRY: "₺",
};

export const SKILL_LEVELS = {
  BEGINNER: "Başlangıç",
  INTERMEDIATE: "Orta",
  ADVANCED: "İleri",
  INDEPENDENT: "Bağımsız Rider",
} as const;

export const LESSON_TYPES = {
  PRIVATE: "Özel Ders",
  SEMI_PRIVATE: "Yarı Özel",
  GROUP: "Grup Dersi",
  EQUIPMENT_RENTAL: "Ekipman Kiralama",
  SUPERVISION: "Süpervizyon",
} as const;

export const RESERVATION_STATUSES = {
  PLANNED: "Planlandı",
  CHECKED_IN: "Check-in Yapıldı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
  NO_SHOW: "Gelmedi",
  WIND_CANCELLED: "Rüzgar İptali",
} as const;

export const PAYMENT_METHODS = {
  CASH: "Nakit",
  BANK_TRANSFER: "Havale/EFT",
  CREDIT_CARD: "Kredi Kartı",
  OTHER: "Diğer",
} as const;

export const EXPENSE_CATEGORIES = {
  RENT: "Kira",
  EQUIPMENT_PURCHASE: "Ekipman Alımı",
  EQUIPMENT_REPAIR: "Ekipman Tamiri",
  FUEL: "Yakıt",
  STAFF: "Personel",
  FOOD: "Yemek",
  MARKETING: "Pazarlama",
  UTILITIES: "Faturalar",
  INSURANCE: "Sigorta",
  OTHER: "Diğer",
} as const;

export const PAYMENT_MODELS = {
  HOURLY_RATE: "Saat Başı Ücret",
  REVENUE_SHARE: "Gelir Paylaşımı",
  SALARY_PLUS_BONUS: "Maaş + Prim",
} as const;

export const EQUIPMENT_TYPES = {
  KITE: "Uçurtma",
  BOARD: "Tahta",
  HARNESS: "Trapez",
  WETSUIT: "Wetsuit",
  BAR: "Bar",
  OTHER: "Diğer",
} as const;

export const EQUIPMENT_STATUSES = {
  AVAILABLE: "Boşta",
  IN_USE: "Kullanımda",
  REPAIR: "Tamirde",
  RETIRED: "Hizmet Dışı",
} as const;

export const ROLE_LABELS = {
  ADMIN: "Admin",
  RECEPTION: "Resepsiyon",
  INSTRUCTOR: "Eğitmen",
} as const;

export const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-800",
  CHECKED_IN: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  NO_SHOW: "bg-red-100 text-red-800",
  WIND_CANCELLED: "bg-purple-100 text-purple-800",
};
