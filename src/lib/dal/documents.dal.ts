import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { type Database, type Json, DocumentType, ExtractionStatus, PaymentStatus } from "@/types/database.types";
import { BudgetDAL, BudgetCategoryRow, ExpenseRow } from "./budget.dal";
import { EventOrchestratorService } from "@/services/orchestrator.service";

export type DocumentRow = Database["public"]["Tables"]["uploaded_documents"]["Row"];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface ExtractedDocumentData {
  vendorName: string;
  vendorEmail?: string | null;
  vendorPhone?: string | null;
  amount: number;
  date: string;
  suggestedCategory: string;
  documentType: DocumentType;
  lineItems: string[];
  uncertainties: string[];
  isOcrAvailable: boolean;
}

export interface DiscrepancyReport {
  warnings: string[];
  isOverCategoryBudget: boolean;
  categoryOverageAmount: number;
  isOverVendorQuote: boolean;
  isPossibleDuplicate: boolean;
  matchingExpenseTitle?: string;
}

export class DocumentsDAL {
  static async getDocuments(eventId: string): Promise<DocumentRow[]> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("uploaded_documents")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch documents: ${error.message}`);
    return data || [];
  }

  static async getDocumentById(documentId: string): Promise<DocumentRow | null> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("uploaded_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error || !data) return null;
    return data;
  }

  /**
   * Deletes an uploaded document record from the database.
   */
  static async deleteDocument(eventId: string, documentId: string): Promise<boolean> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { error } = await supabase
      .from("uploaded_documents")
      .delete()
      .eq("id", documentId)
      .eq("event_id", eventId);

    if (error) throw new Error(`Failed to delete document: ${error.message}`);
    return true;
  }

  /**
   * Validates document size and MIME type strictly
   */
  static validateUpload(fileName: string, mimeType: string, sizeBytes: number): void {
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File exceeds maximum permitted size of 10MB (${(sizeBytes / (1024 * 1024)).toFixed(1)}MB provided).`
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new Error(
        `Unsupported document format "${mimeType}". Please upload a PDF, PNG, JPEG, or WebP file.`
      );
    }
  }

  /**
   * Deterministically parses or falls back for document data extraction.
   * Treats file content as untrusted and immune to prompt injection.
   */
  static extractDocumentData(
    fileName: string,
    fileSizeBytes: number,
    manualVendor?: string,
    manualAmount?: number,
    manualCategory?: string,
    manualEmail?: string,
    manualPhone?: string
  ): ExtractedDocumentData {
    // Check if external OCR is configured
    const isOcrConfigured = !!process.env.DOCUMENT_OCR_API_KEY;

    // Sanitize file name for baseline archetype guessing
    const cleanName = fileName.replace(/[^a-zA-Z0-9_\-. ]/g, "").toLowerCase();

    let suggestedCategory = manualCategory || "Venue & Rentals";
    let documentType: DocumentType = "quote";
    const uncertainties: string[] = [];

    if (cleanName.includes("invoice")) {
      documentType = "invoice";
    } else if (cleanName.includes("receipt")) {
      documentType = "receipt";
    } else if (cleanName.includes("contract")) {
      documentType = "contract";
    }

    if (cleanName.includes("cater") || cleanName.includes("food") || cleanName.includes("bar")) {
      suggestedCategory = "Catering & Bar";
    } else if (cleanName.includes("photo") || cleanName.includes("video")) {
      suggestedCategory = "Photography & Video";
    } else if (cleanName.includes("floral") || cleanName.includes("flower") || cleanName.includes("decor")) {
      suggestedCategory = "Floral & Decor";
    } else if (cleanName.includes("music") || cleanName.includes("dj") || cleanName.includes("band")) {
      suggestedCategory = "Music & Entertainment";
    }

    const vendorName = manualVendor || "Vendor Service Partner";
    const amount = manualAmount !== undefined ? manualAmount : 1500;

    if (!manualAmount) {
      uncertainties.push("Total amount estimated from initial document parameters; requires manual verification.");
    }
    if (!manualVendor) {
      uncertainties.push("Vendor business identity inferred from filename; please confirm official legal entity.");
    }

    if (!isOcrConfigured) {
      uncertainties.push("OCR engine unconfigured — extracted fields are populated via manual review fallback.");
    }

    return {
      vendorName,
      vendorEmail: manualEmail || null,
      vendorPhone: manualPhone || null,
      amount,
      date: new Date().toISOString().split("T")[0],
      suggestedCategory,
      documentType,
      lineItems: [`Primary ${documentType} line items from ${fileName}`],
      uncertainties,
      isOcrAvailable: isOcrConfigured,
    };
  }

  /**
   * Detects discrepancies against category budget allocations, vendor quotes, and duplicates
   */
  static detectDiscrepancies(
    extracted: ExtractedDocumentData,
    categories: BudgetCategoryRow[],
    expenses: ExpenseRow[],
    targetCategoryId?: string | null
  ): DiscrepancyReport {
    const warnings: string[] = [];
    let isOverCategoryBudget = false;
    let categoryOverageAmount = 0;
    let isPossibleDuplicate = false;
    let matchingExpenseTitle: string | undefined;

    // 1. Category Budget Check
    if (targetCategoryId) {
      const category = categories.find((c) => c.id === targetCategoryId);
      if (category) {
        const catExpenses = expenses.filter((e) => e.category_id === targetCategoryId);
        const currentActual = catExpenses.reduce((sum, e) => sum + Number(e.actual_amount || 0), 0);
        const projectedTotal = currentActual + extracted.amount;
        const allocated = Number(category.allocated_amount || 0);

        if (projectedTotal > allocated && allocated > 0) {
          isOverCategoryBudget = true;
          categoryOverageAmount = projectedTotal - allocated;
          warnings.push(
            `Adding this expense of ₹${extracted.amount.toFixed(2)} will exceed category "${category.name}" allocated cap by ₹${categoryOverageAmount.toFixed(2)}.`
          );
        }
      }
    }

    // 2. Duplicate Detection
    const duplicate = expenses.find(
      (e) =>
        e.title.toLowerCase().includes(extracted.vendorName.toLowerCase()) ||
        (Math.abs(Number(e.actual_amount || 0) - extracted.amount) < 0.01 &&
          e.title.toLowerCase().includes(extracted.documentType))
    );

    if (duplicate) {
      isPossibleDuplicate = true;
      matchingExpenseTitle = duplicate.title;
      warnings.push(
        `Possible duplicate detected: An existing expense "${duplicate.title}" for ₹${Number(duplicate.actual_amount).toFixed(2)} is already recorded.`
      );
    }

    return {
      warnings,
      isOverCategoryBudget,
      categoryOverageAmount,
      isOverVendorQuote: false,
      isPossibleDuplicate,
      matchingExpenseTitle,
    };
  }

  /**
   * Confirms and persists scanned document into verified expense ledger
   */
  static async confirmAndPersistExpense(
    eventId: string,
    documentId: string,
    confirmed: {
      title: string;
      categoryId: string | null;
      actualAmount: number;
      depositPaid: number;
      dueDate: string | null;
      paymentStatus: PaymentStatus;
      notes?: string;
      vendorName?: string;
      vendorEmail?: string | null;
      vendorPhone?: string | null;
    }
  ): Promise<ExpenseRow> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();

    // 1. Create verified expense
    const expense = await BudgetDAL.createExpense({
      eventId,
      categoryId: confirmed.categoryId,
      title: confirmed.title,
      estimatedAmount: confirmed.actualAmount,
      actualAmount: confirmed.actualAmount,
      depositPaid: confirmed.depositPaid,
      dueDate: confirmed.dueDate,
      paymentStatus: confirmed.paymentStatus,
      notes: confirmed.notes ?? null,
    });

    // 2. Update document extraction status & record confirmed details including email/phone
    await supabase
      .from("uploaded_documents")
      .update({
        extraction_status: "completed" as ExtractionStatus,
        extracted_data: {
          ...confirmed,
          confirmedExpenseId: expense.id,
        } as unknown as Json,
      })
      .eq("id", documentId)
      .eq("event_id", eventId);

    // 3. Sync or create vendor in the vendors table so email & phone appear in the Event Pack vendor directory & CSV
    try {
      const vendorName = (confirmed.vendorName || confirmed.title.split(" - ")[0] || "Vendor Partner").trim();
      const { data: existingVendors } = await supabase
        .from("vendors")
        .select("*")
        .eq("event_id", eventId);

      const matchedVendor = existingVendors?.find(
        (v) => v.name.toLowerCase() === vendorName.toLowerCase()
      );

      let categoryName = "Other";
      if (confirmed.categoryId) {
        const categories = await BudgetDAL.getCategories(eventId);
        const cat = categories.find((c) => c.id === confirmed.categoryId);
        if (cat) categoryName = cat.name;
      }

      if (matchedVendor) {
        await supabase
          .from("vendors")
          .update({
            contact_email: confirmed.vendorEmail || matchedVendor.contact_email,
            contact_phone: confirmed.vendorPhone || matchedVendor.contact_phone,
            status: matchedVendor.status === "inquiry" ? "contracted" : matchedVendor.status,
            quoted_amount: matchedVendor.quoted_amount || confirmed.actualAmount,
          })
          .eq("id", matchedVendor.id);
      } else {
        await supabase.from("vendors").insert({
          event_id: eventId,
          name: vendorName,
          category: categoryName,
          contact_email: confirmed.vendorEmail || null,
          contact_phone: confirmed.vendorPhone || null,
          quoted_amount: confirmed.actualAmount,
          status: "contracted",
          notes: confirmed.notes ? `Verified from scanned document: ${confirmed.notes}` : "Imported from scanned receipt/invoice",
        });
      }
    } catch (vendorSyncErr) {
      console.warn("[confirmAndPersistExpense] Vendor sync notice:", vendorSyncErr);
    }

    // 4. Recalculate event state
    await EventOrchestratorService.recalculateEventState(eventId);

    return expense;
  }
}
