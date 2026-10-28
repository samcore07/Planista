import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { EventsDAL } from "@/lib/dal/events.dal";
import { DocumentsDAL, ExtractedDocumentData } from "@/lib/dal/documents.dal";
import { BudgetDAL } from "@/lib/dal/budget.dal";
import { GroqClient } from "@/lib/ai/groq";
import { uploadDocumentAction, confirmScannedExpenseAction, deleteDocumentAction } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Trash2,
} from "lucide-react";

export const instant = false;

interface PageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ docId?: string; error?: string; deleted?: string }>;
}

export default async function ScannerPage({ params, searchParams }: PageProps) {
  const { eventId } = await params;
  const { docId, error: errorMessage, deleted } = await searchParams;

  const user = await getAuthenticatedUser();
  if (!user) redirect(`/auth/login?redirectTo=/events/${eventId}/scanner`);

  const event = await EventsDAL.getEventById(eventId);
  if (!event) redirect("/dashboard");

  const [documents, categories, expenses] = await Promise.all([
    DocumentsDAL.getDocuments(eventId),
    BudgetDAL.getCategories(eventId),
    BudgetDAL.getExpenses(eventId),
  ]);

  const activeDoc = docId ? documents.find((d) => d.id === docId) : null;
  const extractedData = (activeDoc?.extracted_data as unknown as ExtractedDocumentData) || null;

  // Detect discrepancies if active document has extracted data
  const discrepancyReport = extractedData
    ? DocumentsDAL.detectDiscrepancies(
        extractedData,
        categories,
        expenses,
        categories.find((c) => c.name.toLowerCase() === extractedData.suggestedCategory.toLowerCase())?.id || null
      )
    : null;

  const isGroqConfigured = GroqClient.isConfigured();
  const isOcrConfigured = isGroqConfigured || !!process.env.DOCUMENT_OCR_API_KEY;

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Document Scanner...</div>}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Quote & Receipt Scanner</h1>
            <p className="text-sm text-muted-foreground">
              Securely upload vendor quotes and receipts with automated extraction and discrepancy warnings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isGroqConfigured ? (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 gap-1.5 py-1">
                <Cpu className="h-3.5 w-3.5" />
                AI Vision Active (Groq Qwen Vision)
              </Badge>
            ) : isOcrConfigured ? (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 gap-1.5 py-1">
                <Cpu className="h-3.5 w-3.5" />
                OCR Engine Active
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 gap-1.5 py-1">
                <HelpCircle className="h-3.5 w-3.5" />
                Manual Review Fallback
              </Badge>
            )}
          </div>
        </div>

        {/* Error alert */}
        {errorMessage && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Delete success alert */}
        {deleted === "true" && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/50 p-3 text-xs text-emerald-950 dark:text-emerald-100 font-medium flex items-center gap-2.5 shadow-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Document deleted successfully.</span>
          </div>
        )}

        {/* OCR Engine Notice */}
        {!isOcrConfigured && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
            <p className="font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              AI Vision Engine Notice (Manual Fallback Active)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure <code>GROQ_API_KEY</code> in your environment to enable automated Llama 3.2 Vision invoice scanning. Planista provides full manual entry and verification so you can record quotes and receipts without any blocker.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload Form & Previously Uploaded Documents */}
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Document
                </CardTitle>
                <CardDescription>
                  Supports PDF, PNG, JPEG, and WebP (up to 10MB). Document content is parsed strictly with least-privilege security.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={uploadDocumentAction.bind(null, eventId)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Document File</Label>
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendorName">Vendor Name (Optional Override)</Label>
                    <Input id="vendorName" name="vendorName" placeholder="e.g. Grand Plaza Ballroom" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="vendorEmail">Email (Optional)</Label>
                      <Input id="vendorEmail" name="vendorEmail" type="email" placeholder="e.g. contact@vendor.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendorPhone">Phone (Optional)</Label>
                      <Input id="vendorPhone" name="vendorPhone" type="tel" placeholder="e.g. +91 98765 43210" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ({event.currency})</Label>
                      <Input id="amount" name="amount" type="number" step="0.01" placeholder="e.g. 2500" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        name="category"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    Upload & Extract
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Document Ledger */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Document Repository ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {documents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No documents uploaded yet.</p>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${
                        doc.id === docId ? "bg-accent/40 border-primary" : "hover:bg-accent/10"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-medium truncate">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {doc.document_type} • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {doc.extraction_status === "completed" ? (
                          <Badge variant="outline" className="border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-medium text-[10px]">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-medium text-[10px]">
                            Pending
                          </Badge>
                        )}
                        <Link href={`/events/${eventId}/scanner?docId=${doc.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            Review
                          </Button>
                        </Link>
                        <form action={deleteDocumentAction.bind(null, eventId, doc.id)}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Review-and-Correct Screen */}
          <div className="lg:col-span-7">
            {activeDoc && extractedData ? (
              <Card className="border-primary/40">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        Review & Verify Extracted Data
                      </CardTitle>
                      <CardDescription>
                        Scanned from <strong>{activeDoc.file_name}</strong>. Inspect extracted fields and resolve
                        uncertainties before saving.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {extractedData.documentType}
                      </Badge>
                      <form action={deleteDocumentAction.bind(null, eventId, activeDoc.id)}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 text-xs"
                          title="Delete document"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Discrepancy Warnings */}
                  {discrepancyReport && discrepancyReport.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                      <p className="text-xs font-semibold text-amber-500 flex items-center gap-1.5 uppercase tracking-wider">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Budget Discrepancy & Duplicate Warnings
                      </p>
                      <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                        {discrepancyReport.warnings.map((warn, i) => (
                          <li key={i} className="text-foreground">
                            {warn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Uncertainties Callout */}
                  {extractedData.uncertainties.length > 0 && (
                    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5" />
                        Uncertain Fields Requiring Confirmation:
                      </p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                        {extractedData.uncertainties.map((u, i) => (
                          <li key={i}>{u}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Review-and-Correct Form */}
                  <form
                    action={confirmScannedExpenseAction.bind(null, eventId, activeDoc.id)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="title">Expense Title / Vendor Description</Label>
                      <Input
                        id="title"
                        name="title"
                        defaultValue={`${extractedData.vendorName} - ${extractedData.documentType.toUpperCase()}`}
                        required
                      />
                    </div>

                    <input type="hidden" name="vendorName" value={extractedData.vendorName} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendorEmail">Vendor Contact Email</Label>
                        <Input
                          id="vendorEmail"
                          name="vendorEmail"
                          type="email"
                          defaultValue={extractedData.vendorEmail || ""}
                          placeholder="e.g. contact@vendor.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vendorPhone">Vendor Phone Number</Label>
                        <Input
                          id="vendorPhone"
                          name="vendorPhone"
                          type="tel"
                          defaultValue={extractedData.vendorPhone || ""}
                          placeholder="e.g. +91 98765 43210"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="actualAmount">Actual Amount ({event.currency})</Label>
                        <Input
                          id="actualAmount"
                          name="actualAmount"
                          type="number"
                          step="0.01"
                          defaultValue={extractedData.amount}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="depositPaid">Deposit Paid ({event.currency})</Label>
                        <Input
                          id="depositPaid"
                          name="depositPaid"
                          type="number"
                          step="0.01"
                          defaultValue={extractedData.documentType === "receipt" ? extractedData.amount : 0}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="categoryId">Budget Category</Label>
                        <select
                          id="categoryId"
                          name="categoryId"
                          defaultValue={
                            categories.find(
                              (c) => c.name.toLowerCase() === extractedData.suggestedCategory.toLowerCase()
                            )?.id || "uncategorized"
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="uncategorized">Uncategorized</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} (Cap: {event.currency} {Number(c.allocated_amount).toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="paymentStatus">Payment Status</Label>
                        <select
                          id="paymentStatus"
                          name="paymentStatus"
                          defaultValue={extractedData.documentType === "receipt" ? "fully_paid" : "unpaid"}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="deposit_paid">Deposit Paid</option>
                          <option value="fully_paid">Fully Paid</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input id="dueDate" name="dueDate" type="date" defaultValue={extractedData.date} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes / Extracted Line Items</Label>
                      <Input
                        id="notes"
                        name="notes"
                        defaultValue={extractedData.lineItems.join("; ")}
                        placeholder="Additional details..."
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                      <Link href={`/events/${eventId}/scanner`}>
                        <Button type="button" variant="outline">
                          Dismiss
                        </Button>
                      </Link>
                      <Button type="submit" className="gap-2">
                        Confirm & Save to Budget
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>

                  <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>Discard this document permanently?</span>
                    <form action={deleteDocumentAction.bind(null, eventId, activeDoc.id)}>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Document
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full min-h-[350px] border border-dashed rounded-lg flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground">No Document Selected for Review</h3>
                <p className="text-xs max-w-sm mt-1">
                  Upload a vendor quote or receipt on the left, or select an existing document to review and record it in
                  your verified budget ledger.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Suspense>
  );
}
