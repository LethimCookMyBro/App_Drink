import { z } from "zod";
import { exportAdminDatasetToGoogleSheets } from "@/lib/adminExport";
import { ADMIN_EXPORT_DATASETS } from "@/lib/adminExportTypes";
import { requireAdmin } from "@/lib/adminAuth";
import { writeAdminAuditLog } from "@/lib/adminSecurity";
import {
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  jsonOk,
} from "@/lib/apiUtils";
import {
  GoogleSheetsConfigurationError,
  GoogleSheetsRequestError,
} from "@/lib/googleSheets";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { getClientIPFromHeaders } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const exportSchema = z.object({
  dataset: z.enum(ADMIN_EXPORT_DATASETS),
});

function resolveExportError(error: unknown): { message: string; status: number } {
  if (error instanceof GoogleSheetsConfigurationError) {
    return {
      message: error.message,
      status: 503,
    };
  }

  if (error instanceof GoogleSheetsRequestError) {
    return {
      message: error.message,
      status: 502,
    };
  }

  return {
    message: "ไม่สามารถ export ข้อมูลไป Google Sheets ได้",
    status: 500,
  };
}

export async function POST(request: Request) {
  const originBlocked = enforceSameOrigin(request);
  if (originBlocked) return originBlocked;

  const rateLimited = enforceRateLimit(request, rateLimitConfigs.admin);
  if (rateLimited) return rateLimited;

  const admin = await requireAdmin();
  if (!admin) {
    return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
  }

  const rawBody = await request.json().catch(() => null);
  const validation = exportSchema.safeParse(rawBody);
  if (!validation.success) {
    return jsonError("dataset ที่ต้องการ export ไม่ถูกต้อง", 400);
  }

  const { dataset } = validation.data;
  const ip = getClientIPFromHeaders(request.headers);
  const userAgent = request.headers.get("user-agent") ?? undefined;

  try {
    const result = await exportAdminDatasetToGoogleSheets(dataset, admin);

    await writeAdminAuditLog({
      adminId: admin.id,
      action: "ADMIN_EXPORT_GOOGLE_SHEETS",
      status: "SUCCESS",
      ip,
      userAgent,
      metadata: {
        dataset,
        tabsUpdated: result.tabsUpdated,
      },
    });

    return jsonOk({
      success: true,
      dataset,
      ...result,
    });
  } catch (error) {
    const { message, status } = resolveExportError(error);

    await writeAdminAuditLog({
      adminId: admin.id,
      action: "ADMIN_EXPORT_GOOGLE_SHEETS",
      status: "FAILURE",
      ip,
      userAgent,
      metadata: {
        dataset,
        message,
      },
    });

    return jsonError(message, status);
  }
}
