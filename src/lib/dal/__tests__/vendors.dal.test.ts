/**
 * @fileoverview Unit and isolation tests for VendorsDAL.
 * Tests tenant isolation, authorization checks, and CRUD queries.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { VendorsDAL } from "../vendors.dal";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}));

describe("VendorsDAL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = { id: "user-123", email: "planner@planista.io" };

  it("throws Unauthorized error when user session is missing", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);

    await expect(VendorsDAL.getVendors("ev-123")).rejects.toThrow("Unauthorized");
    await expect(VendorsDAL.getVendorByName("ev-123", "Acme")).rejects.toThrow("Unauthorized");
    await expect(
      VendorsDAL.createVendor({
        event_id: "ev-123",
        name: "Acme",
        category: "Catering",
      })
    ).rejects.toThrow("Unauthorized");
  });

  it("fetches vendors ordered by name", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce(mockUser as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>);

    const mockData = [
      { id: "v-1", name: "Acoustic Audio", category: "AV", event_id: "ev-123" },
      { id: "v-2", name: "Grand Ballroom", category: "Venue", event_id: "ev-123" },
    ];

    const mockOrder = vi.fn().mockResolvedValueOnce({ data: mockData, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(createClient).mockResolvedValueOnce({ from: mockFrom } as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await VendorsDAL.getVendors("ev-123");
    expect(result).toEqual(mockData);
    expect(mockFrom).toHaveBeenCalledWith("vendors");
    expect(mockEq).toHaveBeenCalledWith("event_id", "ev-123");
    expect(mockOrder).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("queries vendor by name case-insensitively", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce(mockUser as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>);

    const mockVendor = { id: "v-1", name: "Grand Ballroom", category: "Venue", event_id: "ev-123" };
    const mockMaybeSingle = vi.fn().mockResolvedValueOnce({ data: mockVendor, error: null });
    const mockIlike = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEq = vi.fn().mockReturnValue({ ilike: mockIlike });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(createClient).mockResolvedValueOnce({ from: mockFrom } as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await VendorsDAL.getVendorByName("ev-123", "grand ballroom");
    expect(result).toEqual(mockVendor);
    expect(mockIlike).toHaveBeenCalledWith("name", "grand ballroom");
  });

  it("creates a single vendor record", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce(mockUser as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>);

    const mockNewVendor = { id: "v-new", name: "Flora Delight", category: "Florist", event_id: "ev-123" };
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: mockNewVendor, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

    vi.mocked(createClient).mockResolvedValueOnce({ from: mockFrom } as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await VendorsDAL.createVendor({
      event_id: "ev-123",
      name: "Flora Delight",
      category: "Florist",
    });

    expect(result).toEqual(mockNewVendor);
  });

  it("handles batch vendor inserts gracefully", async () => {
    // Empty array returns early without database call
    const emptyResult = await VendorsDAL.createVendors([]);
    expect(emptyResult).toEqual([]);

    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce(mockUser as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>);

    const batch = [
      { event_id: "ev-123", name: "V1", category: "C1" },
      { event_id: "ev-123", name: "V2", category: "C2" },
    ];
    const mockCreated = batch.map((b, i) => ({ ...b, id: `v-${i}` }));

    const mockSelect = vi.fn().mockResolvedValueOnce({ data: mockCreated, error: null });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

    vi.mocked(createClient).mockResolvedValueOnce({ from: mockFrom } as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await VendorsDAL.createVendors(batch);
    expect(result).toEqual(mockCreated);
  });

  it("rejects empty or whitespace identifiers defensively", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>);

    await expect(VendorsDAL.getVendors("")).rejects.toThrow("Invalid event identifier");
    await expect(VendorsDAL.getVendors("   ")).rejects.toThrow("Invalid event identifier");
    await expect(VendorsDAL.getVendorByName("", "Acme")).rejects.toThrow("Invalid event or vendor name identifier");
    await expect(VendorsDAL.getVendorByName("ev-123", "")).rejects.toThrow("Invalid event or vendor name identifier");
    await expect(VendorsDAL.updateVendor("", { name: "Test" })).rejects.toThrow("Invalid vendor identifier");
  });
});
