import { vi } from "vitest";

// Mock server-only so it doesn't throw outside Next.js
vi.mock("server-only", () => ({}));

// Mock Next.js cache and navigation (no-ops in tests)
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));

// Mock audit logger to avoid extra DB writes in unit tests
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
