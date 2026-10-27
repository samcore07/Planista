"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { DocumentsDAL } from "@/lib/dal/documents.dal";
import { type Json } from "@/types/database.types";

export async function uploadDocumentAction(eventId: string, formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) redirect(`/auth/login?redirectTo=/events/${eventId}/scanner`);

  const file = formData.get("file") as File | null;
  const manualVendor = (formData.get("vendorName") as string) || undefined;
  const manualAmountRaw = formData.get("amount");
  const manualAmount = manualAmountRaw ? Number(manualAmountRaw) : undefined;
  const manualCategory = (formData.get("category") as string) || undefined;

  if (!file || file.size === 0) {
    redirect(`/events/${eventId}/scanner?error=${encodeURIComponent("Please select a document file to upload.")}`);
  }

  try {
    // 1. Validate upload restrictions
    DocumentsDAL.validateUpload(file.name, file.type, file.size);

    // 2. Perform server-side extraction (prompt-injection immune, untrusted text safe)
    const extractedData = DocumentsDAL.extractDocumentData(
      file.name,
      file.size,
      manualVendor,
      manualAmount,
      manualCategory
    );

    const supabase = await createClient();

    // 3. Insert into uploaded_documents table
    const { data: doc, error: insertError } = await supabase
      .from("uploaded_documents")
      .insert({
        event_id: eventId,
        file_name: file.name,
        file_url: `/documents/${eventId}/${file.name}`,
        file_size_bytes: file.size,
        mime_type: file.type,
        document_type: extractedData.documentType,
        extraction_status: "pending",
        extracted_data: extractedData as unknown as Json,
      })
      .select()
      .single();

    if (insertError || !doc) {
      throw new Error(`Failed to save document metadata: ${insertError?.message}`);
    }

    revalidatePath(`/events/${eventId}/scanner`);
    redirect(`/events/${eventId}/scanner?docId=${doc.id}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process document";
    redirect(`/events/${eventId}/scanner?error=${encodeURIComponent(message)}`);
  }
}

export async function confirmScannedExpenseAction(
  eventId: string,
  documentId: string,
  formData: FormData
): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) redirect(`/auth/login?redirectTo=/events/${eventId}/scanner`);

  const title = (formData.get("title") as string) || "Scanned Vendor Expense";
  const categoryIdRaw = formData.get("categoryId") as string;
  const categoryId = categoryIdRaw && categoryIdRaw !== "uncategorized" ? categoryIdRaw : null;
  const actualAmount = Number(formData.get("actualAmount") || 0);
  const depositPaid = Number(formData.get("depositPaid") || 0);
  const dueDate = (formData.get("dueDate") as string) || null;
  const paymentStatus = (formData.get("paymentStatus") as "unpaid" | "deposit_paid" | "fully_paid") || "unpaid";
  const notes = (formData.get("notes") as string) || "";

  try {
    await DocumentsDAL.confirmAndPersistExpense(eventId, documentId, {
      title,
      categoryId,
      actualAmount,
      depositPaid,
      dueDate,
      paymentStatus,
      notes,
    });

    revalidatePath(`/events/${eventId}/scanner`);
    revalidatePath(`/events/${eventId}/budget`);
    revalidatePath(`/events/${eventId}`);
    redirect(`/events/${eventId}/budget?saved=true`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to confirm scanned expense";
    redirect(`/events/${eventId}/scanner?docId=${documentId}&error=${encodeURIComponent(message)}`);
  }
}
