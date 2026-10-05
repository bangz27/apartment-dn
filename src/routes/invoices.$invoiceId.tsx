import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ConnectIssue, messageOf } from "@/components/connect-issue";
import { ReceiptCard } from "@/components/receipt-card";
import { Shell } from "@/components/shell";
import { Button, Card } from "@/components/ui";
import { deleteInvoice, getInvoice, listBuildings, listInvoiceItems, setInvoiceStatus, type InvoiceItem, type InvoiceStatus } from "@/lib/api";
import { thaiMonth } from "@/lib/format";
import { saveReceiptImage, type ReceiptPicture } from "@/lib/receipt-image";
import { useRefresh } from "@/lib/use-refresh";
import { useMounted } from "@/lib/use-mounted";

export const Route = createFileRoute("/invoices/$invoiceId")({ component: InvoicePage });

function pictureOf(
  invoiceNo: number,
  tenant: string | null,
  monthLabel: string,
  buildingName: string,
  status: InvoiceStatus,
  items: InvoiceItem[],
  total: number,
): ReceiptPicture {
  return {
    invoiceNo,
    tenant: tenant || "ไม่ระบุผู้เช่า",
    monthLabel,
    buildingName,
    status,
    total,
    items: items.map((item) => ({
      roomNo: item.room_no,
      rent: item.rent,
      electricUsage: item.electric_usage,
      electricAmount: item.electric_amount,
      waterUsage: item.water_usage,
      waterAmount: item.water_amount,
      garbage: item.garbage,
      total: item.total,
    })),
  };
}

function InvoicePage() {
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const mounted = useMounted();
  const refresh = useRefresh();
  const invoice = useQuery({ queryKey: ["invoice", invoiceId], queryFn: () => getInvoice(invoiceId), enabled: mounted });
  const items = useQuery({ queryKey: ["invoice-items", invoiceId], queryFn: () => listInvoiceItems(invoiceId), enabled: mounted });
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: listBuildings, enabled: mounted });
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryError = invoice.error ?? items.error;
  const row = invoice.data;
  const building = buildings.data?.find((item) => item.id === row?.building_id);

  async function change(status: InvoiceStatus) {
    setPending(true);
    setError(null);
    try {
      await setInvoiceStatus(invoiceId, status);
      await refresh();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(false);
    }
  }

  async function onSave() {
    if (!row || !items.data) return;
    setSaving(true);
    setError(null);
    try {
      await saveReceiptImage(
        pictureOf(row.invoice_no, row.tenant_name, thaiMonth(row.month), building?.name ?? "", row.status, items.data, row.total),
      );
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setPending(true);
    setError(null);
    try {
      await deleteInvoice(invoiceId);
      await refresh();
      await navigate({ to: "/invoices" });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Shell title="รายละเอียดบิล">
      <Link to="/invoices" className="mb-3 inline-flex min-h-11 items-center text-sm text-accent">
        กลับไปรายการบิล
      </Link>
      {!mounted || invoice.isPending || items.isPending ? <p className="text-sm text-muted">กำลังโหลด</p> : null}
      {queryError ? <ConnectIssue error={queryError} /> : null}
      {row === null && !invoice.isPending && !queryError ? <p>ไม่พบใบแจ้งหนี้</p> : null}
      {row && items.data ? (
        <div className="flex flex-col gap-3">
          <ReceiptCard
            invoiceNo={row.invoice_no}
            tenant={row.tenant_name || "ไม่ระบุผู้เช่า"}
            monthLabel={thaiMonth(row.month)}
            buildingName={building?.name ?? ""}
            status={row.status}
            items={items.data}
            total={row.total}
          />
          {row.status === "due" ? (
            <Button disabled={pending} onClick={() => change("paid")}>
              {pending ? "กำลังบันทึก" : "กดชำระแล้ว"}
            </Button>
          ) : null}
          <Button variant="ghost" disabled={saving} onClick={onSave}>
            {saving ? "กำลังสร้างรูป" : "เซฟเป็นรูป"}
          </Button>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {row.status === "paid" ? (
            <Button variant="ghost" disabled={pending} onClick={() => change("due")}>
              กลับเป็นค้างชำระ
            </Button>
          ) : null}
          {row.status === "cancelled" ? (
            <Button disabled={pending} onClick={() => change("due")}>
              เปิดบิลอีกครั้ง
            </Button>
          ) : (
            <Button variant="danger" disabled={pending} onClick={() => change("cancelled")}>
              ยกเลิกบิล
            </Button>
          )}
          {confirmDelete ? (
            <Card>
              <p>ลบบิล #{row.invoice_no} ถาวร บิลจะหายจากรายการ และมิเตอร์จะถูกถอยถ้ายังไม่ถูกใช้ในบิลถัดไป</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="ghost" disabled={pending} onClick={() => setConfirmDelete(false)}>
                  กลับไปแก้
                </Button>
                <Button variant="danger" disabled={pending} onClick={onDelete}>
                  ลบบิล
                </Button>
              </div>
            </Card>
          ) : (
            <Button variant="danger" disabled={pending} onClick={() => setConfirmDelete(true)}>
              ลบบิลถาวร
            </Button>
          )}
        </div>
      ) : null}
    </Shell>
  );
}
