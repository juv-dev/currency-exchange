import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "~/firebase/config";

vi.mock("firebase/firestore", () => ({
  initializeFirestore: vi.fn(() => "mockedFirestore"),
  doc: vi.fn(() => "mockedDoc"),
  onSnapshot: vi.fn(),
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => "mockedApp"),
}));

describe("Firebase Config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize Firestore', () => {
    expect(db).toBe("mockedFirestore");
  });
});
