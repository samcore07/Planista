/**
 * @fileoverview Data Access Layer for Vendors.
 * Enforces tenant isolation, input sanitation, and unified database queries.
 */

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";

export type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];
export type VendorInsert = Database["public"]["Tables"]["vendors"]["Insert"];
export type VendorUpdate = Database["public"]["Tables"]["vendors"]["Update"];
export type VendorStatus = Database["public"]["Enums"]["vendor_status"];

export class VendorsDAL {
  /**
   * Retrieves all vendors registered under a specific event with authorization checks.
   */
  static async getVendors(eventId: string): Promise<VendorRow[]> {
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
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("event_id", eventId)
      .ilike("name", name)
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
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vendors")
      .insert(vendor)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create vendor: ${error?.message}`);
    }

    return data;
  }

  /**
   * Updates an existing vendor record.
   */
  static async updateVendor(vendorId: string, updates: VendorUpdate): Promise<VendorRow> {
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
      throw new Error(`Failed to update vendor: ${error?.message}`);
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
