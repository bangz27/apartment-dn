import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Card } from "@/components/ui";
import { GARBAGE, RENT } from "@/lib/rent";
import { diagnoseBuildings, type FetchDiag } from "@/lib/sb";
import { maskKey, SUPABASE_URL } from "@/lib/supabase-public";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const [diag, setDiag] = useState<FetchDiag | null>(null);
  const [pending, setPending] = useState(false);

  async function onTest() {
    setPending(true);
    try {
      setDiag(await diagnoseBuildings());
    } finally {
      setPending(false);
    }
  }

  return (
    <Shell title="ตั้งค่า">
      <div className="flex flex-col gap-3">
        <Card>
          <h2 className="font-medium">สูตรคงที่</h2>
          <p className="mt-2 text-sm tabular-nums">ค่าเช่า {RENT.toLocaleString("th-TH")} บาท/ห้อง</p>
          <p className="text-sm tabular-nums">ค่าขยะ {GARBAGE.toLocaleString("th-TH")} บาท/ห้อง</p>
          <p className="mt-2 text-sm text-muted">ค่าไฟและค่าน้ำอยู่ที่แต่ละอาคาร ใบเก่าไม่ถูกเขียนทับเมื่อแก้เรต</p>
        </Card>
        <Card>
          <h2 className="font-medium">Supabase</h2>
          <p className="mt-2 break-all text-sm">{SUPABASE_URL}</p>
          <p className="text-sm text-muted">publishable key {maskKey("sb_publishable_JupCwxxk_DpFJ6BIbHom9g_dsgkzwId")}</p>
          <Button className="mt-3" disabled={pending} onClick={onTest}>
            ทดสอบการเชื่อมต่อ
          </Button>
          {diag ? (
            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt className="text-muted">URL</dt>
                <dd className="break-all">{diag.url}</dd>
              </div>
              <div>
                <dt className="text-muted">HTTP status</dt>
                <dd className="tabular-nums">{diag.status ?? "ไม่มี response"}</dd>
              </div>
              <div>
                <dt className="text-muted">error name</dt>
                <dd>{diag.errorName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">error message</dt>
                <dd className="break-words">{diag.errorMessage ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">navigator.onLine</dt>
                <dd>{diag.online === null ? "—" : String(diag.online)}</dd>
              </div>
              <div>
                <dt className="text-muted">response body</dt>
                <dd className="break-words font-mono text-xs">{diag.body ?? "—"}</dd>
              </div>
            </dl>
          ) : null}
        </Card>
      </div>
    </Shell>
  );
}
