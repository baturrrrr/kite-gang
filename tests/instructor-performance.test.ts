import { describe, it, expect } from "vitest";
import { summarizeSessions, summarizeBalance, type SessionInput } from "@/lib/instructor-performance";

const rates = { TRY: 1, USD: 40, EUR: 45 };

function session(overrides: Partial<SessionInput>): SessionInput {
  return {
    id: "s",
    kind: "DERS",
    date: new Date("2026-09-10T10:00:00Z"),
    studentId: "student-1",
    studentName: "Ali Yılmaz",
    title: "Özel Ders",
    hours: 2,
    earning: null,
    ...overrides,
  };
}

describe("summarizeSessions", () => {
  it("ders, saat, öğrenci ve hakedişi TL olarak toplar", () => {
    const summary = summarizeSessions(
      [
        session({ id: "a", hours: 2, earning: { amount: 60, currency: "EUR" } }),
        session({ id: "b", kind: "HIZMET", hours: 1.5, earning: { amount: 1000, currency: "TRY" } }),
        session({ id: "c", studentId: "student-2", studentName: "Ayşe Kara", hours: null, earning: null }),
      ],
      rates
    );

    expect(summary.sessionCount).toBe(3);
    expect(summary.totalHours).toBe(3.5);
    expect(summary.studentCount).toBe(2);
    expect(summary.earnedTRY).toBe(60 * 45 + 1000);
  });

  it("satırları en yeniden eskiye sıralar", () => {
    const summary = summarizeSessions(
      [
        session({ id: "eski", date: new Date("2026-09-01T10:00:00Z") }),
        session({ id: "yeni", date: new Date("2026-09-20T10:00:00Z") }),
      ],
      rates
    );

    expect(summary.rows.map((r) => r.id)).toEqual(["yeni", "eski"]);
  });

  it("aynı isimli farklı öğrencileri ayrı sayar", () => {
    const summary = summarizeSessions(
      [session({ id: "a", studentId: "student-1" }), session({ id: "b", studentId: "student-9" })],
      rates
    );

    expect(summary.studentCount).toBe(2);
  });
});

describe("summarizeBalance", () => {
  it("bekleyen bakiye = hak edilen − ödenen", () => {
    const balance = summarizeBalance(
      [{ amount: 100, currency: "EUR" }, { amount: 500, currency: "TRY" }],
      [{ amount: 2000, currency: "TRY" }],
      rates
    );

    expect(balance.earnedTRY).toBe(4500 + 500);
    expect(balance.paidTRY).toBe(2000);
    expect(balance.pendingTRY).toBe(3000);
  });

  it("fazla ödemede bekleyen bakiye negatife düşmez", () => {
    const balance = summarizeBalance([{ amount: 100, currency: "TRY" }], [{ amount: 150, currency: "TRY" }], rates);

    expect(balance.pendingTRY).toBe(0);
  });
});
