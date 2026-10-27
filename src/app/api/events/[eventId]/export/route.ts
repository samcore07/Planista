import { getAuthenticatedUser } from "@/lib/supabase/server";
import { ExportService } from "@/services/export.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "html";

  // Prevent duplicate concurrent export requests for the same event and format
  const acquired = ExportService.acquireLock(eventId, format);
  if (!acquired) {
    return new Response(
      JSON.stringify({ error: "An export job is already running for this event. Please wait." }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const bundle = await ExportService.getEventExportBundle(eventId);
    const sanitizedTitle = bundle.event.title.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (format === "budget_csv") {
      const csv = ExportService.generateBudgetCsv(bundle);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${sanitizedTitle}_budget.csv"`,
        },
      });
    }

    if (format === "tasks_csv") {
      const csv = ExportService.generateTasksCsv(bundle);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${sanitizedTitle}_tasks_run_sheet.csv"`,
        },
      });
    }

    if (format === "vendors_csv") {
      const csv = ExportService.generateVendorsCsv(bundle);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${sanitizedTitle}_vendors.csv"`,
        },
      });
    }

    // Default: Printable HTML event pack (print stylesheet triggers PDF save)
    const html = ExportService.generatePrintableHtml(bundle);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate export";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    ExportService.releaseLock(eventId, format);
  }
}
