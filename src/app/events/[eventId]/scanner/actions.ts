/**
 * @fileoverview Server Actions for Quote & Receipt OCR Document Scanner and Live QR Attendee Validation.
 * Leverages Groq Multimodal Vision with deterministic fallback and tenant-isolated document repositories.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { DocumentsDAL } from "@/lib/dal/documents.dal";
import { GroqClient } from "@/lib/ai/groq";

/**
 * Uploads a vendor quote or invoice document, extracting line items and verifying budget caps.
 *
 * @param eventId - Target event UUID.
 * @param formData - Multi-part form data containing the uploaded file and manual overrides.
 */
export async function uploadDocumentAction(eventId: string, formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) redirect(`/auth/login?redirectTo=/events/${eventId}/scanner`);

  const file = formData.get("file") as File | null;
  const manualVendor = (formData.get("vendorName") as string) || undefined;
  const manualEmail = (formData.get("vendorEmail") as string) || undefined;
  const manualPhone = (formData.get("vendorPhone") as string) || undefined;
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
      manualCategory,
      manualEmail,
      manualPhone
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
            vendorEmail: manualEmail || aiExtracted.vendorEmail || null,
            vendorPhone: manualPhone || aiExtracted.vendorPhone || null,
            amount: manualAmount !== undefined ? manualAmount : aiExtracted.amount,
            suggestedCategory: manualCategory || aiExtracted.suggestedCategory,
          };
        }
      } catch (e) {
        console.warn("[uploadDocumentAction] AI extraction fallback:", e);
      }
    }

    // 3. Insert into uploaded_documents table via DAL
    const doc = await DocumentsDAL.createUploadedDocument({
      eventId,
      fileName: file.name,
      fileUrl: `/documents/${eventId}/${file.name}`,
      fileSizeBytes: file.size,
      mimeType: file.type,
      documentType: extractedData.documentType,
      extractionStatus: "pending",
      extractedData,
    });

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
  const vendorName = (formData.get("vendorName") as string) || undefined;
  const vendorEmail = (formData.get("vendorEmail") as string) || undefined;
  const vendorPhone = (formData.get("vendorPhone") as string) || undefined;
  const categoryIdRaw = formData.get("categoryId") as string;
  const categoryId = categoryIdRaw && categoryIdRaw !== "uncategorized" ? categoryIdRaw : null;
  const actualAmount = Number(formData.get("actualAmount") || 0);
  const rawDepositPaid = Number(formData.get("depositPaid") || 0);
  const dueDate = (formData.get("dueDate") as string) || null;
  const paymentStatus = (formData.get("paymentStatus") as "unpaid" | "deposit_paid" | "fully_paid") || "unpaid";
  const notes = (formData.get("notes") as string) || "";

  // If fully_paid (paid in full / once), deposit equals full actual amount
  const depositPaid = paymentStatus === "fully_paid" ? actualAmount : Math.min(actualAmount, rawDepositPaid);

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
      vendorName,
      vendorEmail,
      vendorPhone,
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

export async function deleteDocumentAction(eventId: string, documentId: string): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) redirect(`/auth/login?redirectTo=/events/${eventId}/scanner`);

  let deleteSuccess = false;
  try {
    await DocumentsDAL.deleteDocument(eventId, documentId);
    deleteSuccess = true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete document";
    redirect(`/events/${eventId}/scanner?error=${encodeURIComponent(message)}`);
  }

  if (deleteSuccess) {
    revalidatePath(`/events/${eventId}/scanner`);
    redirect(`/events/${eventId}/scanner?deleted=true`);
  }
}
