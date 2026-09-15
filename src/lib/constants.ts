export const GENDER_OPTIONS = {
  MALE: "Erkek",
  FEMALE: "Kadın",
  OTHER: "Diğer",
} as const;

export const COUNTRIES = [
  "Türkiye", "Almanya", "Fransa", "İngiltere", "İtalya", "İspanya",
  "Hollanda", "Belçika", "İsveç", "Rusya", "ABD", "Diğer",
];

export const LANGUAGES = [
  "Türkçe", "İngilizce", "Almanca", "Fransızca", "İspanyolca",
  "İtalyanca", "Rusça", "Felemenkçe", "Portekizce", "Diğer",
];

export const CURRENCIES = ["TRY", "EUR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  TRY: "₺",
};

export const HIZMET_CATEGORIES = {
  EGITIM: "Eğitim",
  KIRALAMA: "Kiralama",
  URUN: "Satılabilir Ürün",
  UYELIK: "Üyelik",
  ETKINLIK: "Etkinlik",
} as const;

export const ZAMAN_BIRIMLERI = {
  SABIT: "Sabit",
  SAATLIK: "Saatlik",
  YARIM_GUN: "Yarım Gün",
  TAM_GUN: "Tam Gün",
} as const;

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
  PLANNED: "bg-info/15 text-info",
  CHECKED_IN: "bg-warning/15 text-warning",
  COMPLETED: "bg-success/15 text-success",
  CANCELLED: "bg-muted text-foreground",
  NO_SHOW: "bg-destructive/15 text-destructive",
  WIND_CANCELLED: "bg-info/15 text-info",
};
