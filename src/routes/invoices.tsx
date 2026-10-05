import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ConnectIssue, messageOf } from "@/components/connect-issue";
import { Shell } from "@/components/shell";
import { Badge, Button, Card, Empty } from "@/components/ui";
import { listBuildings, listInvoices, setInvoiceStatus, type InvoiceStatus } from "@/lib/api";
import { baht, statusLabel, thaiMonth } from "@/lib/format";
import { useRefresh } from "@/lib/use-refresh";
import { useMounted } from "@/lib/use-mounted";

export const Route = createFileRoute("/invoices")({ component: InvoicesPage });

const FILTERS: { id: "all" | InvoiceStatus; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "due", label: "ค้างอยู่" },
  { id: "paid", label: "ที่จ่ายแล้ว" },
  { id: "cancelled", label: "ยกเลิก" },
];

function InvoicesPage() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  if (path.startsWith("/invoices/") && path.length > "/invoices/".length) return <Outlet />;
  const mounted = useMounted();
  const refresh = useRefresh();
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: listInvoices, enabled: mounted });
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: listBuildings, enabled: mounted });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const error = invoices.error ?? buildings.error;
  const rows = (invoices.data ?? []).filter((invoice) => filter === "all" || invoice.status === filter);

  async function markPaid(id: string) {
    setPendingId(id);
    setPayError(null);
    try {
      await setInvoiceStatus(id, "paid");
      await refresh();
    } catch (err) {
      setPayError(messageOf(err));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Shell title="ใบแจ้งหนี้">
      {!mounted || invoices.isPending ? <p className="text-sm text-muted">กำลังโหลด</p> : null}
      {error ? <ConnectIssue error={error} /> : null}
      {invoices.data && !error ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto">
            {FILTERS.map((item) => (
              <Button key={item.id} variant={filter === item.id ? "primary" : "ghost"} onClick={() => setFilter(item.id)}>
                {item.label}
              </Button>
            ))}
          </div>
          {rows.length === 0 ? <Empty title="ไม่มีใบแจ้งหนี้" body="แตะบิลเพื่อเปิดรายละเอียดค่าห้อง ค่าไฟ ค่าน้ำ และเซฟเป็นรูป" /> : (
            <p className="text-sm text-muted">แตะบิลเพื่อเปิดรายละเอียด</p>
          )}
          {payError ? <p className="text-sm text-danger">{payError}</p> : null}
          {rows.map((invoice) => {
            const building = buildings.data?.find((item) => item.id === invoice.building_id);
            return (
              <Card key={invoice.id} className="flex flex-col gap-3">
                {invoice.status === "due" ? (
                  <Button disabled={pendingId === invoice.id} onClick={() => markPaid(invoice.id)}>
                    {pendingId === invoice.id ? "กำลังบันทึก" : "กดชำระแล้ว"}
                  </Button>
                ) : null}
                <Link to="/invoices/$invoiceId" params={{ invoiceId: invoice.id }} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      #{invoice.invoice_no} · {invoice.tenant_name || "ไม่ระบุผู้เช่า"}
                    </p>
                    <p className="text-sm text-muted">
                      {thaiMonth(invoice.month)}
                      {building ? ` · ${building.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">{baht(invoice.total)}</p>
                    <Badge tone={invoice.status}>{statusLabel(invoice.status)}</Badge>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      ) : null}
    </Shell>
  );
}
