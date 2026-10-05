import { baht, meterText } from "@/lib/format";

export type ReceiptPicture = {
  invoiceNo: number;
  tenant: string;
  monthLabel: string;
  buildingName: string;
  status: "due" | "paid" | "cancelled";
  items: {
    roomNo: string;
    rent: number;
    electricUsage: number;
    electricAmount: number;
    waterUsage: number;
    waterAmount: number;
    garbage: number;
    total: number;
  }[];
  total: number;
};

const W = 840;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("โหลดโลโก้ไม่สำเร็จ"));
    image.src = src;
  });
}

function row(ctx: CanvasRenderingContext2D, y: number, label: string, value: string) {
  ctx.fillStyle = "#1b2430";
  ctx.font = "28px Loma, Sarabun, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(label, 56, y);
  ctx.textAlign = "right";
  ctx.fillText(value, W - 56, y);
  ctx.textAlign = "left";
  return y + 46;
}

export async function receiptBlob(input: ReceiptPicture): Promise<Blob> {
  const height = 520 + input.items.length * 280;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("สร้างรูปไม่สำเร็จ");
  await document.fonts.load("28px Loma").catch(() => undefined);

  ctx.fillStyle = "#f7f5f0";
  ctx.fillRect(0, 0, W, height);
  ctx.fillStyle = "#16324f";
  ctx.fillRect(0, 0, W, 168);

  try {
    const logo = await loadImage("/logo-daengniem.png");
    const logoH = 92;
    const logoW = (logo.width / logo.height) * logoH;
    ctx.drawImage(logo, 48, 38, logoW, logoH);
  } catch {
    ctx.fillStyle = "#f7f5f0";
    ctx.font = "bold 42px Loma, Sarabun, sans-serif";
    ctx.fillText("DAENG NIEM", 48, 100);
  }

  let y = 220;
  ctx.fillStyle = "#1b2430";
  ctx.font = "bold 40px Loma, Sarabun, sans-serif";
  ctx.fillText(`ใบแจ้งหนี้ #${input.invoiceNo}`, 48, y);
  y += 48;
  ctx.font = "28px Loma, Sarabun, sans-serif";
  ctx.fillStyle = "#5e6b7c";
  ctx.fillText(`${input.tenant} · ${input.monthLabel} · ${input.buildingName}`, 48, y);
  y += 36;

  for (const item of input.items) {
    y += 28;
    ctx.fillStyle = "#16324f";
    ctx.font = "bold 32px Loma, Sarabun, sans-serif";
    ctx.fillText(`ห้อง ${item.roomNo}`, 48, y);
    y += 52;
    y = row(ctx, y, "ค่าห้อง", baht(item.rent));
    y = row(ctx, y, `ค่าไฟ ${meterText(item.electricUsage)} หน่วย`, baht(item.electricAmount));
    y = row(ctx, y, `ค่าน้ำ ${meterText(item.waterUsage)} หน่วย`, baht(item.waterAmount));
    y = row(ctx, y, "ค่าขยะ", baht(item.garbage));
    ctx.fillStyle = "#d5dce4";
    ctx.fillRect(48, y - 16, W - 96, 2);
    y += 16;
    ctx.font = "bold 28px Loma, Sarabun, sans-serif";
    y = row(ctx, y, "รวมห้องนี้", baht(item.total));
  }

  y += 24;
  ctx.fillStyle = "#16324f";
  ctx.fillRect(40, y, W - 80, 120);
  ctx.fillStyle = "#f7f5f0";
  ctx.font = "28px Loma, Sarabun, sans-serif";
  ctx.fillText("รวมยอดที่ต้องชำระ", 64, y + 48);
  ctx.font = "bold 36px Loma, Sarabun, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(baht(input.total), W - 64, y + 78);
  ctx.textAlign = "left";
  y += 170;

  const paid = input.status === "paid";
  ctx.fillStyle = paid ? "#1d6b45" : "#8d2f2f";
  ctx.font = "bold 64px Loma, Sarabun, sans-serif";
  ctx.fillText(paid ? "✓" : "✕", 48, y);
  ctx.font = "bold 32px Loma, Sarabun, sans-serif";
  ctx.fillText(paid ? "กดชำระแล้ว" : "ยังไม่ชำระ", 120, y - 8);
  ctx.font = "26px Loma, Sarabun, sans-serif";
  ctx.fillStyle = "#5e6b7c";
  ctx.fillText(paid ? "มีเครื่องหมายถูก" : "มีกากบาท", 120, y + 32);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("สร้างรูปไม่สำเร็จ");
  return blob;
}

export async function saveReceiptImage(input: ReceiptPicture) {
  const blob = await receiptBlob(input);
  const file = new File([blob], `daengniem-bill-${input.invoiceNo}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `ใบแจ้งหนี้ #${input.invoiceNo}`, text: `${input.tenant} ${baht(input.total)}` });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}
