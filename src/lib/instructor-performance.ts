import { toTRY, type Rates } from "./currency";

// Eğitmen portalı "Performansım" hesapları. Tutarlar güncel kurla TL'ye çevrilir.

type Money = { amount: number; currency: string };

export type SessionInput = {
  id: string;
  kind: "DERS" | "HIZMET";
  date: Date;
  studentId: string | null;
  studentName: string | null;
  title: string;
  hours: number | null;
  earning: Money | null;
};

export function summarizeSessions(sessions: SessionInput[], rates: Rates | null) {
  const rows = sessions
    .map((s) => ({ ...s, earnedTRY: s.earning ? toTRY(s.earning.amount, s.earning.currency, rates) : null }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    rows,
    sessionCount: rows.length,
    totalHours: rows.reduce((sum, r) => sum + (r.hours ?? 0), 0),
    studentCount: new Set(rows.map((r) => r.studentId).filter(Boolean)).size,
    earnedTRY: rows.reduce((sum, r) => sum + (r.earnedTRY ?? 0), 0),
  };
}

// Hakediş ödemesi ders ve hizmet hakedişlerini birlikte kapatır (bkz. recordInstructorPayout),
// bu yüzden bekleyen bakiye tek tek "ödendi" bayraklarından değil, toplam ödemeden hesaplanır.
export function summarizeBalance(earnings: Money[], payouts: Money[], rates: Rates | null) {
  const earnedTRY = earnings.reduce((sum, e) => sum + toTRY(e.amount, e.currency, rates), 0);
  const paidTRY = payouts.reduce((sum, p) => sum + toTRY(p.amount, p.currency, rates), 0);
  return { earnedTRY, paidTRY, pendingTRY: Math.max(0, earnedTRY - paidTRY) };
}
