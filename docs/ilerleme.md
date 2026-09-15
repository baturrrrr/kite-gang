# Kite Gang Corner — ilerleme notu

Son güncelleme: 15 Eylül 2026. Bir sonraki oturum buradan devam eder.

## Ürün kararları

- Uygulama içinde **online ödeme alınmayacak** (vergi/resmi işlem yükü istenmiyor).
- **Müşteri portalı** yapılacak (ödemesiz). Sıradaki büyük iş bu.
- **Eğitmen portalı** yapıldı: eğitmen yalnızca kendi performansını, kendi ders programını ve kendi öğrencilerinin adlarını görür; check-in/check-out yapabilir; hakediş (hak edilen/ödenen/bekleyen) görür.
- Küçük, lokal işletmeler hedef: QR check-in / turnike gibi donanım yok, ücretli WhatsApp/SMS hatırlatma yok.
- Rüzgar iptali butonu istenmiyor; operasyonda yalnızca "Gelmedi" (no-show) var ve yalnızca admin/resepsiyona açık.

## Git durumu

Hiçbir şey `main`'e birleştirilmedi ve GitHub'a gönderilmedi.

- `duzeltme/para-birimi-oturum-no-show` (main'den):
  - `60c44b5` 11 Eylül'deki commit edilmemiş çalışma (ekipman adedi, hizmet süresi, rezervasyon filtreleri)
  - `43acf6a` Para birimi toplamları, no-show/check-in paket kuralları, kur yedeği, oturum doğrulaması
  - `f998ae7` Operasyonda "Gelmedi" butonu; kasa yardımcıları `src/lib/cash.ts`'e taşındı
  - `5883232` Eğitmen portalı (Performansım) + admin ile ortak hakediş hesabı (`src/lib/instructor-performance-data.ts`)
- `tasarim/spor-markasi` (üsttekinden):
  - `16287c2` Koyu tema altyapısı, responsive iskelet (masaüstü menü, mobil üst bar + çekmece + alt gezinme)
  - `4f946c5` Taslaktaki ekranlar: Dashboard (gelir grafiği), Müşteriler, Kasa, Operasyon, Performansım
  - `ea42301` Mavi kalıntılar marka rengine, Performans Özeti kart ızgarası
  - `0784e9e` Başlıklarda Türkçe büyük harf düzeltmesi (CHECK-IN, yabancı müşteri adları)

## Tasarım

- Onaylanan yön: **cesur spor markası**, tek koyu tema. Taslak: https://claude.ai/artifact/FVnYR6rKxKo74TLbEkSByi
  (kullanıcı claude.ai linkini açamadı; yerel önizleme işe yaradı — kopyası: `docs/tasarim-taslagi.html`, tarayıcıda doğrudan açılır)
- Renkler `src/app/globals.css`: zemin `#0b0d10`, kart `#14181d`, kenar `#232930`, vurgu elektrik yeşili `#d7ff3f` (üstünde koyu metin), `success`/`warning`/`info`/`destructive` durum renkleri.
- Fontlar `src/lib/fonts.ts`: Barlow Condensed (büyük harf başlık/rakam) + Manrope.
- Ortak bileşenler: `components/layout/page-header.tsx`, `stat-card.tsx`, `pill.tsx`, `nav-config.ts`, `mobile-nav.tsx`, `components/brand/logo.tsx`, `components/charts/revenue-chart.tsx`, `components/weather/wind-card.tsx`.
- Para formatı `src/lib/currency.ts`: `formatTL` (₺842.454,00 · −₺3.000,00), `formatCurrency` (€15.000,00).
- Türkçe büyük harf tuzağı: İngilizce kelimeler ve marka adı `lang="en"`, yabancı müşteri adları `normal-case`.

## Test durumu (15 Eylül)

- 33 test geçiyor, TypeScript temiz.
- Admin ve eğitmen (Ahmet) olarak masaüstü + mobilde gerçek tıklamayla test edildi: check-in, check-out, gelmedi, eğitmenin yalnızca kendi derslerini görmesi, Performansım'ın anında güncellenmesi.
- **Görsel olarak kontrol edilmedi:** admin eğitmen detay sayfasının check-out sonrası hali (Chrome eğitmen girişliydi; aynı hesap fonksiyonunu kullanıyor).

## Geliştirme veritabanında deneme verisi (karar bekliyor)

Kullanıcı müşteri/eğitmen verilerinin gerçek kişiler olmadığını söyledi ve deneme rezervasyonuna izin verdi.

- `Reservation.id` `deneme-res-1..4`, notu "DENEME — test rezervasyonu" (15 Eylül):
  - `deneme-res-1` John Smith / Ahmet — COMPLETED (check-out edildi)
  - `deneme-res-2` Maria Garcia / Ahmet — CHECKED_IN (suda)
  - `deneme-res-3` Tom Johnson / Ahmet — NO_SHOW
  - `deneme-res-4` Hans Müller / Fatma — PLANNED
- Yan etkiler: John Smith paketi (`cmtg06pav0019ejjihighht7y`) 4,0 → 2,0 saat; Ahmet'e ödenmemiş 50 EUR hakediş eklendi; iki `Lesson` kaydı ve `AuditLog` kayıtları oluştu.
- Kullanıcıya soruldu: silinip geri alınsın mı, örnek olarak kalsın mı — cevap bekleniyor.

## Açık işler

1. Deneme verisi kararı (yukarıda).
2. **Müşteri portalı** (ödemesiz) — sıradaki büyük iş.
3. Önceden var olan lint hataları: ödeme/paket satış diyaloglarında effect içinde setState, `rezervasyonlar/page.tsx` tırnak işaretleri, kullanılmayan importlar.
4. Diyalog ve form içlerinin yeni tasarıma göre elden geçirilmesi.
5. Dalların `main`'e birleştirilmesi (kullanıcı onayıyla).
6. Bilinen sınır: farklı para birimindeki ödemeler borç hesabında güncel kurla çevriliyor (ödeme anındaki kur saklanmıyor); süresi dolmuş paketler hâlâ kullanılabiliyor (iş kuralı kararı bekliyor).

## Çalıştırma

- `npm run dev` → http://localhost:3000 (giriş hesapları `prisma/seed.ts` içinde)
- `npm test`, `npx tsc --noEmit`, `npm run lint`
- `db:reset` / `seed` çalıştırmak geliştirme verisini siler.
