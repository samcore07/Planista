import { getAuthenticatedUser } from "@/lib/supabase/server";
import { EventsDAL } from "@/lib/dal/events.dal";
import { BudgetDAL } from "@/lib/dal/budget.dal";
import { TasksDAL } from "@/lib/dal/tasks.dal";
import { RiskDAL } from "@/lib/dal/risk.dal";
import { VendorsDAL } from "@/lib/dal/vendors.dal";
import { DocumentsDAL } from "@/lib/dal/documents.dal";
import { ExportCsvBuilder } from "./export/export-csv.builder";
import { ExportHtmlBuilder } from "./export/export-html.builder";
import type { EventExportBundle, VendorRow } from "./export/export.types";

export type { EventExportBundle, VendorRow };

// In-memory mutex for preventing concurrent duplicate export jobs
const activeExportJobs = new Set<string>();

export class ExportService {
  /**
   * Acquires an export lock to prevent duplicate export hammering
   */
  static acquireLock(eventId: string, format: string): boolean {
    const key = `${eventId}_${format}`;
    if (activeExportJobs.has(key)) {
      return false;
    }
    activeExportJobs.add(key);
    // Auto-release after 15 seconds max safety timeout
    setTimeout(() => activeExportJobs.delete(key), 15000);
    return true;
  }

  static releaseLock(eventId: string, format: string): void {
    const key = `${eventId}_${format}`;
    activeExportJobs.delete(key);
  }

  /**
   * Retrieves a complete snapshot of all latest saved event data
   */
  static async getEventExportBundle(eventId: string): Promise<EventExportBundle> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const event = await EventsDAL.getEventById(eventId);
    if (!event) throw new Error("Event not found or access denied");

    const [categories, expenses, tasks, risks, rawVendors, documents] = await Promise.all([
      BudgetDAL.getCategories(eventId),
      BudgetDAL.getExpenses(eventId),
      TasksDAL.getTasks(eventId),
      RiskDAL.getRisks(eventId),
      VendorsDAL.getVendors(eventId),
      DocumentsDAL.getDocuments(eventId),
    ]);

    // Build O(1) map for vendor enrichment from scanned documents
    const vendorMap = new Map<string, VendorRow>();
    for (const v of rawVendors) {
      vendorMap.set(v.name.toLowerCase(), { ...v });
    }

    for (const doc of documents) {
      const data = doc.extracted_data as Record<string, unknown> | null;
      if (!data) continue;

      const vendorName = String(data.vendorName || "").trim();
      const rawEmail = String(data.vendorEmail || data.contact_email || data.email || "").trim();
      const vendorEmail = rawEmail && rawEmail.includes("@") && rawEmail.toLowerCase() !== "null" ? rawEmail : null;
      const rawPhone = String(data.vendorPhone || data.contact_phone || data.phone || "").trim();
      const vendorPhone = rawPhone && rawPhone.length >= 7 && rawPhone.toLowerCase() !== "null" ? rawPhone : null;

      if (!vendorName && !vendorEmail && !vendorPhone) continue;

      const lowerName = vendorName.toLowerCase();
      const existing = vendorMap.get(lowerName);

      if (existing) {
        if (!existing.contact_email && vendorEmail) {
          existing.contact_email = vendorEmail;
        }
        if (!existing.contact_phone && vendorPhone) {
          existing.contact_phone = vendorPhone;
        }
      } else if (vendorName) {
        vendorMap.set(lowerName, {
          id: `doc_vendor_${doc.id}`,
          event_id: eventId,
          name: vendorName,
          category: String(data.suggestedCategory || "Other"),
          contact_email: vendorEmail,
          contact_phone: vendorPhone,
          quoted_amount: typeof data.totalAmount === "number" ? data.totalAmount : null,
          status: "inquiry",
          contract_url: null,
          notes: String(data.notes || "Imported from scanned document"),
          created_at: doc.created_at,
          updated_at: doc.created_at,
        });
      }
    }

    const vendors = Array.from(vendorMap.values());

    return {
      event,
      categories,
      expenses,
      tasks,
      risks,
      vendors,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates sanitized CSV string for Budget & Expenses.
   */
  static generateBudgetCsv(bundle: EventExportBundle): string {
    return ExportCsvBuilder.buildBudgetCsv(bundle);
  }

  /**
   * Generates sanitized CSV string for Tasks & Timeline Run Sheet.
   */
  static generateTasksCsv(bundle: EventExportBundle): string {
    return ExportCsvBuilder.buildTasksCsv(bundle);
  }

  /**
   * Generates sanitized CSV string for Vendors directory.
   */
  static generateVendorsCsv(bundle: EventExportBundle): string {
    return ExportCsvBuilder.buildVendorsCsv(bundle);
  }

  /**
   * Generates a comprehensive, print-friendly HTML document with full print stylesheet.
   * Users can print directly to PDF or paper using standard browser print capabilities.
   */
  static generatePrintableHtml(bundle: EventExportBundle): string {
    return ExportHtmlBuilder.buildPrintableHtml(bundle);
  }
}
