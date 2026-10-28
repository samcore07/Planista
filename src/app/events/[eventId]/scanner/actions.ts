"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { DocumentsDAL } from "@/lib/dal/documents.dal";
import { GroqClient } from "@/lib/ai/groq";
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

  let createdDocId: string | null = null;
  try {
    // 1. Validate upload restrictions
    DocumentsDAL.validateUpload(file.name, file.type, file.size);

    // 2. Perform server-side extraction (Groq Vision if image & configured, or deterministic fallback)
    let extractedData = DocumentsDAL.extractDocumentData(
      file.name,
      file.size,
      manualVendor,
      manualAmount,
      manualCategory
    );

    if (GroqClient.isConfigured() && file.type.startsWith("image/")) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");
        const aiExtracted = await GroqClient.extractDocumentVision({
          fileName: file.name,
          mimeType: file.type,
          base64Data,
        });

        if (aiExtracted) {
          extractedData = {
            ...aiExtracted,
            vendorName: manualVendor || aiExtracted.vendorName,
            amount: manualAmount !== undefined ? manualAmount : aiExtracted.amount,
            suggestedCategory: manualCategory || aiExtracted.suggestedCategory,
          };
        }
      } catch (e) {
        console.warn("[uploadDocumentAction] AI extraction fallback:", e);
      }
    }

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

    createdDocId = doc.id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process document";
    redirect(`/events/${eventId}/scanner?error=${encodeURIComponent(message)}`);
  }

  if (createdDocId) {
    revalidatePath(`/events/${eventId}/scanner`);
    redirect(`/events/${eventId}/scanner?docId=${createdDocId}`);
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

  let saveSuccess = false;
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
    saveSuccess = true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to confirm scanned expense";
    redirect(`/events/${eventId}/scanner?docId=${documentId}&error=${encodeURIComponent(message)}`);
  }

  if (saveSuccess) {
    revalidatePath(`/events/${eventId}/scanner`);
    revalidatePath(`/events/${eventId}/budget`);
    revalidatePath(`/events/${eventId}`);
    redirect(`/events/${eventId}/budget?saved=true`);
  }
}
