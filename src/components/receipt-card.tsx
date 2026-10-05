import { Check, X } from "lucide-react";
import type { InvoiceItem } from "@/lib/api";
import { baht, meterText } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ReceiptCard({
  invoiceNo,
  tenant,
  monthLabel,
  buildingName,
  status,
  items,
  total,
}: {
  invoiceNo: number;
  tenant: string;
  monthLabel: string;
  buildingName: string;
  status: "due" | "paid" | "cancelled";
  items: InvoiceItem[];
  total: number;
}) {
  const paid = status === "paid";
  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="bg-accent px-4 py-3">
        <img src="/logo-daengniem.png" alt="DAENG NiEM" className="h-10 w-auto" />
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h2 className="text-xl font-medium">ใบแจ้งหนี้ #{invoiceNo}</h2>
          <p className="text-sm text-muted">
            {tenant} · {monthLabel}
            {buildingName ? ` · ${buildingName}` : ""}
          </p>
        </div>
        {items.map((item) => (
          <section key={item.id} className="border-t border-line pt-3">
            <h3 className="font-medium">ห้อง {item.room_no}</h3>
            <ReceiptLine label="ค่าห้อง" value={baht(item.rent)} />
            <ReceiptLine label={`ค่าไฟ ${meterText(item.electric_usage)} หน่วย`} value={baht(item.electric_amount)} />
            <ReceiptLine label={`ค่าน้ำ ${meterText(item.water_usage)} หน่วย`} value={baht(item.water_amount)} />
            <ReceiptLine label="ค่าขยะ" value={baht(item.garbage)} />
            <ReceiptLine label="รวมห้องนี้" value={baht(item.total)} strong />
          </section>
        ))}
        <div className="bg-accent px-3 py-3 text-accent-fg">
          <p className="text-sm">รวมยอดที่ต้องชำระ</p>
          <p className="text-2xl font-medium tabular-nums">{baht(total)}</p>
        </div>
        <div className={cn("flex items-center gap-3", paid ? "text-ok" : "text-danger")}>
          {paid ? <Check className="size-10" aria-hidden="true" /> : <X className="size-10" aria-hidden="true" />}
          <div>
            <p className="text-lg font-medium">{paid ? "กดชำระแล้ว" : "ยังไม่ชำระ"}</p>
            <p className="text-sm">{paid ? "เครื่องหมายถูก" : "กากบาท"}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ReceiptLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <p className={cn("flex items-baseline justify-between gap-3 text-sm tabular-nums", strong && "mt-1 font-medium")}>
      <span>{label}</span>
      <span>{value}</span>
    </p>
  );
}
