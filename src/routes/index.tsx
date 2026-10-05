import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ConnectIssue } from "@/components/connect-issue";
import { Shell } from "@/components/shell";
import { Badge, Button, Card } from "@/components/ui";
import { listBuildings, listInvoices, listRooms, type Invoice } from "@/lib/api";
import { cn } from "@/lib/cn";
import { baht, statusLabel, thaiMonth } from "@/lib/format";
import { useMounted } from "@/lib/use-mounted";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const mounted = useMounted();
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: listBuildings, enabled: mounted });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: listRooms, enabled: mounted });
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: listInvoices, enabled: mounted });
  const error = buildings.error ?? rooms.error ?? invoices.error;
  const pending = !mounted || buildings.isPending || rooms.isPending || invoices.isPending;

  const roomRows = rooms.data ?? [];
  const invoiceRows = invoices.data ?? [];
  const occupied = roomRows.filter((room) => room.tenant_name).length;
  const active = invoiceRows.filter((invoice) => invoice.status !== "cancelled");
  const billed = active.reduce((sum, invoice) => sum + invoice.total, 0);
  const due = invoiceRows.filter((invoice) => invoice.status === "due").reduce((sum, invoice) => sum + invoice.total, 0);

  return (
    <Shell title="ภาพรวม">
      {pending ? <p className="text-sm text-muted">กำลังโหลด</p> : null}
      {!pending && error ? <ConnectIssue error={error} /> : null}
      {!pending && !error ? (
        <div className="flex flex-col gap-4">
          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line">
            <Stat label="ห้องทั้งหมด" value={String(roomRows.length)} />
            <Stat label="มีผู้เช่า" value={String(occupied)} />
            <Stat label="ยอดเรียกเก็บ" value={baht(billed)} />
            <Stat label="ค้างชำระ" value={baht(due)} alert={due > 0} />
          </section>
          <Card className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">ใบแจ้งหนี้</p>
              <p className="text-lg font-medium tabular-nums">{invoiceRows.length} ใบ</p>
            </div>
            <Link to="/billing">
              <Button>เรียกเก็บ</Button>
            </Link>
          </Card>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted">ล่าสุด</h2>
            {invoiceRows.length === 0 ? (
              <p className="text-sm text-muted">ยังไม่มีใบแจ้งหนี้</p>
            ) : (
              invoiceRows.slice(0, 5).map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} buildings={buildings.data ?? []} />)
            )}
          </section>
        </div>
      ) : null}
    </Shell>
  );
}

function Stat({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 text-lg font-medium tabular-nums", alert && "text-due")}>{value}</p>
    </div>
  );
}

function InvoiceRow({
  invoice,
  buildings,
}: {
  invoice: Invoice;
  buildings: { id: string; name: string }[];
}) {
  const building = buildings.find((item) => item.id === invoice.building_id);
  return (
    <Link to="/invoices/$invoiceId" params={{ invoiceId: invoice.id }}>
      <Card className="flex items-center justify-between gap-3">
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
      </Card>
    </Link>
  );
}
