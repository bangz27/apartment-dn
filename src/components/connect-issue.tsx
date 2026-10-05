import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { SbError } from "@/lib/sb";

export function ConnectIssue({ error }: { error: unknown }) {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => setOnline(navigator.onLine), []);

  const sb = error instanceof SbError ? error : null;
  const fallback = error instanceof Error ? error : new Error("เชื่อมต่อไม่สำเร็จ");
  const missingTable = sb?.code === "PGRST205";

  return (
    <Card>
      <h2 className="text-base font-medium">เชื่อมต่อไม่สำเร็จ</h2>
      <p className="mt-1 text-sm text-muted">
        {missingTable
          ? "คีย์ใช้ได้ แต่ตารางยังไม่ถูกเปิดบน Data API"
          : "คำขอไปไม่ถึงข้อมูล หรือเซิร์ฟเวอร์ตอบกลับเป็นข้อผิดพลาด"}
      </p>
      <dl className="mt-3 grid gap-2 text-sm">
        <div>
          <dt className="text-muted">URL</dt>
          <dd className="break-all">{sb?.url ?? "https://jqjzkokarmfznwjoqhap.supabase.co/rest/v1/buildings"}</dd>
        </div>
        <div>
          <dt className="text-muted">HTTP status</dt>
          <dd className="tabular-nums">{sb ? (sb.status === 0 ? "ไม่มี response" : sb.status) : "ไม่มี response"}</dd>
        </div>
        <div>
          <dt className="text-muted">error name</dt>
          <dd>{sb?.errorName ?? fallback.name}</dd>
        </div>
        <div>
          <dt className="text-muted">error message</dt>
          <dd className="break-words">{sb?.message ?? fallback.message}</dd>
        </div>
        <div>
          <dt className="text-muted">navigator.onLine</dt>
          <dd>{online === null ? "—" : online ? "true" : "false"}</dd>
        </div>
        {sb?.body ? (
          <div>
            <dt className="text-muted">response body</dt>
            <dd className="break-words font-mono text-xs">{sb.body}</dd>
          </div>
        ) : null}
      </dl>
    </Card>
  );
}

export function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "ทำรายการไม่สำเร็จ";
}
