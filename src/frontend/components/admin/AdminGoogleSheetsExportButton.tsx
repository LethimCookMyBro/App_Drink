"use client";

import { useState } from "react";
import { Button } from "@/frontend/components/ui";
import type { AdminExportDataset } from "@/backend/adminExportTypes";

interface AdminGoogleSheetsExportButtonProps {
  dataset: AdminExportDataset;
  label: string;
  icon?: string;
  variant?: "primary" | "outline" | "ghost";
}

interface ExportResponse {
  error?: string;
  spreadsheetUrl?: string;
  tabsUpdated?: number;
}

export function AdminGoogleSheetsExportButton({
  dataset,
  label,
  icon = "upload_file",
  variant = "outline",
}: AdminGoogleSheetsExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    tone: "default" | "success" | "error";
    message: string;
  } | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setStatus(null);

      const response = await fetch("/api/admin/export/google-sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dataset }),
      });

      const payload = (await response.json().catch(() => null)) as ExportResponse | null;
      if (!response.ok) {
        setStatus({
          tone: "error",
          message: payload?.error || "ส่งออกไป Google Sheets ไม่สำเร็จ",
        });
        return;
      }

      setStatus({
        tone: "success",
        message: `ซิงก์แล้ว ${payload?.tabsUpdated ?? 0} ชีต`,
      });

      if (payload?.spreadsheetUrl) {
        window.open(payload.spreadsheetUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setStatus({
        tone: "error",
        message: "ไม่สามารถเชื่อมต่อเพื่อ export ได้",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={variant}
        size="sm"
        icon={icon}
        loading={loading}
        onClick={handleExport}
        className="shrink-0"
      >
        {label}
      </Button>
      {status ? (
        <p
          className={`text-right text-[11px] ${
            status.tone === "success"
              ? "text-neon-green"
              : status.tone === "error"
                ? "text-neon-red"
                : "text-white/45"
          }`}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

export default AdminGoogleSheetsExportButton;
