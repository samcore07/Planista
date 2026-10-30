/**
 * @fileoverview Data Access Layer for Vendors.
 * Enforces tenant isolation, input sanitation, Zod schema validation, and unified database queries.
 */

import { z } from "zod";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";

export type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];
export type VendorInsert = Database["public"]["Tables"]["vendors"]["Insert"];
export type VendorUpdate = Database["public"]["Tables"]["vendors"]["Update"];
export type VendorStatus = Database["public"]["Enums"]["vendor_status"];

export const createVendorSchema = z.object({
  eventId: z.string().min(1, "Event ID is required").trim(),
  name: z.string().min(1, "Vendor name is required").trim(),
  category: z.string().min(1, "Vendor category is required").trim(),
  contactInfo: z.string().nullable().optional(),
  contractAmount: z.number().min(0, "Contract amount must be non-negative").nullable().optional(),
  status: z.enum(["inquiry", "quoted", "contracted", "declined"]).default("inquiry"),
  notes: z.string().nullable().optional(),
});

export const updateVendorSchema = createVendorSchema.partial().omit({ eventId: true });

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export class VendorsDAL {
  /**
   * Retrieves all vendors registered under a specific event with authorization checks.
   */
  static async getVendors(eventId: string): Promise<VendorRow[]> {
    if (!eventId || typeof eventId !== "string" || !eventId.trim()) {
      throw new Error("Invalid event identifier");
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("event_id", eventId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch vendors: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Finds a vendor by name within an event using case-insensitive matching.
   */
  static async getVendorByName(eventId: string, name: string): Promise<VendorRow | null> {
    if (!eventId?.trim() || !name?.trim()) {
      throw new Error("Invalid event or vendor name identifier");
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("event_id", eventId)
      .ilike("name", name.trim())
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to query vendor: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Creates a new vendor record for an event.
   */
  static async createVendor(vendor: VendorInsert): Promise<VendorRow> {
    if (!vendor.event_id || !vendor.name) {
      throw new Error("Vendor event_id and name are required");
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vendors")
      .insert(vendor)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create vendor: ${error?.message || "Unknown error"}`);
    }

    return data;
  }

  /**
   * Updates an existing vendor record.
   */
  static async updateVendor(vendorId: string, updates: VendorUpdate): Promise<VendorRow> {
    if (!vendorId || typeof vendorId !== "string" || !vendorId.trim()) {
      throw new Error("Invalid vendor identifier");
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vendors")
      .update(updates)
      .eq("id", vendorId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update vendor: ${error?.message || "Unknown error"}`);
    }

    return data;
  }

  /**
   * Batch inserts multiple vendor records (used during initial blueprint persistence).
   */
  static async createVendors(vendors: VendorInsert[]): Promise<VendorRow[]> {
    if (vendors.length === 0) return [];

    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vendors")
      .insert(vendors)
      .select();

    if (error) {
      throw new Error(`Failed to insert vendors: ${error.message}`);
    }

    return data || [];
  }
}
