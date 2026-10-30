import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { EventsDAL, EventRow } from "@/lib/dal/events.dal";
import { BudgetDAL, BudgetCategoryRow, ExpenseRow } from "@/lib/dal/budget.dal";
import { TasksDAL, TaskRow } from "@/lib/dal/tasks.dal";
import { RiskDAL, RiskRow } from "@/lib/dal/risk.dal";
import { Database } from "@/types/database.types";
import { ExportCsvBuilder } from "./export/export-csv.builder";
import { ExportHtmlBuilder } from "./export/export-html.builder";

export type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];

export interface EventExportBundle {
  event: EventRow;
  categories: BudgetCategoryRow[];
  expenses: ExpenseRow[];
  tasks: TaskRow[];
  risks: RiskRow[];
  vendors: VendorRow[];
  generatedAt: string;
}

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

    const supabase = await createClient();

    const [categories, expenses, tasks, risks, vendorsResult, documentsResult] = await Promise.all([
      BudgetDAL.getCategories(eventId),
      BudgetDAL.getExpenses(eventId),
      TasksDAL.getTasks(eventId),
      RiskDAL.getRisks(eventId),
      supabase.from("vendors").select("*").eq("event_id", eventId).order("name", { ascending: true }),
      supabase.from("uploaded_documents").select("*").eq("event_id", eventId),
    ]);

    const vendors = [...(vendorsResult.data || [])];
    const documents = documentsResult.data || [];

    // Enrich existing vendors or merge vendors from scanned documents to guarantee email & phone in exports
    for (const doc of documents) {
      const data = doc.extracted_data as Record<string, unknown> | null;
      if (!data) continue;

      const vendorName = String(data.vendorName || "").trim();
      const rawEmail = String(data.vendorEmail || data.contact_email || data.email || "").trim();
      const vendorEmail = rawEmail && rawEmail.includes("@") && rawEmail.toLowerCase() !== "null" ? rawEmail : null;
      const rawPhone = String(data.vendorPhone || data.contact_phone || data.phone || "").trim();
      const vendorPhone = rawPhone && rawPhone.length >= 7 && rawPhone.toLowerCase() !== "null" ? rawPhone : null;

      if (!vendorName && !vendorEmail && !vendorPhone) continue;

      const existingIndex = vendors.findIndex(
        (v) => v.name.toLowerCase() === vendorName.toLowerCase()
      );

      if (existingIndex >= 0) {
        if (!vendors[existingIndex].contact_email && vendorEmail) {
          vendors[existingIndex].contact_email = vendorEmail;
        }
        if (!vendors[existingIndex].contact_phone && vendorPhone) {
          vendors[existingIndex].contact_phone = vendorPhone;
        }
      } else if (vendorName) {
        vendors.push({
          id: `doc_vendor_${doc.id}`,
          event_id: eventId,
          name: vendorName,
          category: String(data.suggestedCategory || "Other"),
          contact_email: vendorEmail,
          contact_phone: vendorPhone,
          quoted_amount: Number(data.amount || data.actualAmount || 0) || null,
          status: "contracted",
          contract_url: doc.file_url || null,
          notes: String(data.notes || `Scanned from ${doc.file_name}`),
          created_at: doc.created_at,
          updated_at: doc.created_at,
        });
      }
    }

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
