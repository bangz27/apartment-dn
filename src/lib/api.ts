import { calcLine, sumTotals, type LineResult } from "@/lib/rent";
import { sb, SbError } from "@/lib/sb";

export type Building = {
  id: string;
  name: string;
  water_rate: number;
  electric_rate: number;
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  building_id: string;
  room_no: string;
  tenant_name: string | null;
  electric_meter: number;
  water_meter: number;
  created_at: string;
  updated_at: string;
};

export type InvoiceStatus = "due" | "paid" | "cancelled";

export type Invoice = {
  id: string;
  invoice_no: number;
  month: string;
  building_id: string;
  tenant_name: string | null;
  total: number;
  status: InvoiceStatus;
  created_at: string;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  room_id: string;
  room_no: string;
  tenant_name: string;
  previous_electric: number;
  current_electric: number;
  electric_usage: number;
  electric_amount: number;
  previous_water: number;
  current_water: number;
  water_usage: number;
  water_amount: number;
  rent: number;
  garbage: number;
  total: number;
};

export type BillLine = {
  room_id: string;
  current_electric: number;
  current_water: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asBuilding(row: Building): Building {
  return { ...row, water_rate: num(row.water_rate), electric_rate: num(row.electric_rate) };
}

function asRoom(row: Room): Room {
  return {
    ...row,
    tenant_name: row.tenant_name?.trim() ? row.tenant_name.trim() : null,
    electric_meter: num(row.electric_meter),
    water_meter: num(row.water_meter),
  };
}

function asInvoice(row: Invoice): Invoice {
  return { ...row, invoice_no: num(row.invoice_no), total: num(row.total) };
}

function asItem(row: InvoiceItem): InvoiceItem {
  return {
    ...row,
    previous_electric: num(row.previous_electric),
    current_electric: num(row.current_electric),
    electric_usage: num(row.electric_usage),
    electric_amount: num(row.electric_amount),
    previous_water: num(row.previous_water),
    current_water: num(row.current_water),
    water_usage: num(row.water_usage),
    water_amount: num(row.water_amount),
    rent: num(row.rent),
    garbage: num(row.garbage),
    total: num(row.total),
  };
}

function assertUuid(id: string) {
  if (!UUID.test(id)) throw new Error("รหัสไม่ถูกต้อง");
}

function inList(ids: string[]) {
  ids.forEach(assertUuid);
  return ids.join(",");
}

export async function listBuildings(): Promise<Building[]> {
  const rows = await sb<Building[]>("/buildings?select=id,name,water_rate,electric_rate,created_at,updated_at&order=name.asc");
  return rows.map(asBuilding);
}

export async function saveBuilding(input: {
  id?: string;
  name: string;
  electric_rate: number;
  water_rate: number;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("กรุณาระบุชื่ออาคาร");
  if (input.electric_rate < 0 || input.water_rate < 0) throw new Error("ค่าไฟและค่าน้ำต้องไม่ติดลบ");
  const payload = {
    name,
    electric_rate: input.electric_rate,
    water_rate: input.water_rate,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    assertUuid(input.id);
    await sb(`/buildings?id=eq.${input.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
    return;
  }
  await sb("/buildings", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ name, electric_rate: input.electric_rate, water_rate: input.water_rate }),
  });
}

export async function seedOfficialBuildings() {
  const existing = await listBuildings();
  if (existing.length > 0) return existing;
  await sb("/buildings", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([
      { name: "อาคาร 1", electric_rate: 7, water_rate: 13 },
      { name: "อาคาร 2", electric_rate: 10, water_rate: 15 },
    ]),
  });
  return listBuildings();
}

export async function listRooms(): Promise<Room[]> {
  const rows = await sb<Room[]>(
    "/rooms?select=id,building_id,room_no,tenant_name,electric_meter,water_meter,created_at,updated_at",
  );
  return rows
    .map(asRoom)
    .sort((a, b) => a.room_no.localeCompare(b.room_no, "th", { numeric: true }));
}

export async function saveRoom(input: {
  id?: string;
  building_id: string;
  room_no: string;
  tenant_name: string;
  electric_meter: number;
  water_meter: number;
}) {
  assertUuid(input.building_id);
  const room_no = input.room_no.trim();
  if (!room_no) throw new Error("กรุณาระบุเลขห้อง");
  if (input.electric_meter < 0 || input.water_meter < 0) throw new Error("มิเตอร์ต้องไม่ติดลบ");
  const payload = {
    building_id: input.building_id,
    room_no,
    tenant_name: input.tenant_name.trim() || null,
    electric_meter: input.electric_meter,
    water_meter: input.water_meter,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    assertUuid(input.id);
    await sb(`/rooms?id=eq.${input.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
    return;
  }
  await sb("/rooms", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
}

export async function listInvoices(): Promise<Invoice[]> {
  const rows = await sb<Invoice[]>(
    "/invoices?select=id,invoice_no,month,building_id,tenant_name,total,status,created_at&order=created_at.desc",
  );
  return rows.map(asInvoice);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  assertUuid(id);
  const rows = await sb<Invoice[]>(
    `/invoices?id=eq.${id}&select=id,invoice_no,month,building_id,tenant_name,total,status,created_at`,
  );
  return rows[0] ? asInvoice(rows[0]) : null;
}

export async function listInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  assertUuid(invoiceId);
  const rows = await sb<InvoiceItem[]>(
    `/invoice_items?invoice_id=eq.${invoiceId}&select=id,invoice_id,room_id,room_no,tenant_name,previous_electric,current_electric,electric_usage,electric_amount,previous_water,current_water,water_usage,water_amount,rent,garbage,total&order=room_no.asc`,
  );
  return rows.map(asItem);
}

export type PreparedLine = LineResult & {
  room: Room;
  currentElectric: number;
  currentWater: number;
};

export function prepareLines(rooms: Room[], building: Building, lines: BillLine[]): PreparedLine[] {
  if (lines.length === 0) throw new Error("กรุณาเลือกอย่างน้อย 1 ห้อง");
  const seen = new Set<string>();
  const prepared: PreparedLine[] = [];
  for (const line of lines) {
    if (seen.has(line.room_id)) throw new Error("เลือกห้องซ้ำ");
    seen.add(line.room_id);
    const room = rooms.find((item) => item.id === line.room_id);
    if (!room) throw new Error("ไม่พบห้องที่เลือก");
    if (room.building_id !== building.id) throw new Error("ห้องในใบเดียวกันต้องอยู่อาคารเดียวกัน");
    if (!room.tenant_name) throw new Error(`ห้อง ${room.room_no} ยังไม่มีชื่อผู้เช่า`);
    const calc = calcLine({
      previousElectric: room.electric_meter,
      currentElectric: line.current_electric,
      previousWater: room.water_meter,
      currentWater: line.current_water,
      electricRate: building.electric_rate,
      waterRate: building.water_rate,
    });
    prepared.push({
      ...calc,
      room,
      currentElectric: line.current_electric,
      currentWater: line.current_water,
    });
  }
  const tenant = prepared[0]?.room.tenant_name;
  if (prepared.some((line) => line.room.tenant_name !== tenant)) {
    throw new Error("ผู้เช่าต้องเป็นคนเดียวกันในใบแจ้งหนี้เดียว");
  }
  return prepared;
}

async function assertNoDuplicate(month: string, roomIds: string[]) {
  const invoices = await sb<Invoice[]>(
    `/invoices?month=eq.${month}&status=neq.cancelled&select=id,invoice_no,month,building_id,tenant_name,total,status,created_at`,
  );
  if (invoices.length === 0) return;
  const items = await sb<InvoiceItem[]>(
    `/invoice_items?invoice_id=in.(${inList(invoices.map((invoice) => invoice.id))})&room_id=in.(${inList(roomIds)})&select=room_no,room_id,invoice_id,tenant_name,previous_electric,current_electric,electric_usage,electric_amount,previous_water,current_water,water_usage,water_amount,rent,garbage,total`,
  );
  if (items.length > 0) {
    const rooms = [...new Set(items.map((item) => item.room_no))].join(", ");
    throw new Error(`มีใบแจ้งหนี้ของห้อง ${rooms} ในเดือนนี้อยู่แล้ว`);
  }
}

async function createInvoiceFallback(month: string, lines: BillLine[]) {
  const rooms = await listRooms();
  const picked = lines.map((line) => {
    const room = rooms.find((item) => item.id === line.room_id);
    if (!room) throw new Error("ไม่พบห้องที่เลือก");
    return room;
  });
  const buildingId = picked[0]?.building_id;
  if (!buildingId) throw new Error("กรุณาเลือกอย่างน้อย 1 ห้อง");
  const building = (await listBuildings()).find((item) => item.id === buildingId);
  if (!building) throw new Error("ไม่พบอาคาร");
  const prepared = prepareLines(rooms, building, lines);
  await assertNoDuplicate(month, prepared.map((line) => line.room.id));
  const total = sumTotals(prepared);
  const tenant = prepared[0]?.room.tenant_name ?? null;
  const created = await sb<Invoice[]>("/invoices", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ month, building_id: building.id, tenant_name: tenant, total, status: "due" }),
  });
  const invoice = created[0] ? asInvoice(created[0]) : null;
  if (!invoice) throw new Error("สร้างใบแจ้งหนี้ไม่สำเร็จ");
  try {
    await sb("/invoice_items", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(
        prepared.map((line) => ({
          invoice_id: invoice.id,
          room_id: line.room.id,
          room_no: line.room.room_no,
          tenant_name: line.room.tenant_name,
          previous_electric: line.room.electric_meter,
          current_electric: line.currentElectric,
          electric_usage: line.electricUsage,
          electric_amount: line.electricAmount,
          previous_water: line.room.water_meter,
          current_water: line.currentWater,
          water_usage: line.waterUsage,
          water_amount: line.waterAmount,
          rent: line.rent,
          garbage: line.garbage,
          total: line.total,
        })),
      ),
    });
    for (const line of prepared) {
      await sb(`/rooms?id=eq.${line.room.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          electric_meter: line.currentElectric,
          water_meter: line.currentWater,
          updated_at: new Date().toISOString(),
        }),
      });
    }
  } catch (error) {
    await sb(`/invoice_items?invoice_id=eq.${invoice.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(
      () => undefined,
    );
    await sb(`/invoices?id=eq.${invoice.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => undefined);
    throw error;
  }
  return { id: invoice.id, invoice_no: invoice.invoice_no, total };
}

function missingRpc(error: unknown) {
  return error instanceof SbError && (error.code === "PGRST202" || (error.status === 404 && error.body.includes("create_rent_invoice")));
}

export async function createInvoice(month: string, lines: BillLine[]) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("รูปแบบเดือนไม่ถูกต้อง");
  lines.forEach((line) => assertUuid(line.room_id));
  try {
    const result = await sb<{ id: string; invoice_no: number | string; total: number | string }>("/rpc/create_rent_invoice", {
      method: "POST",
      body: JSON.stringify({
        p_month: month,
        p_room_lines: lines.map((line) => ({
          room_id: line.room_id,
          current_electric: line.current_electric,
          current_water: line.current_water,
        })),
      }),
    });
    return { id: result.id, invoice_no: num(result.invoice_no), total: num(result.total) };
  } catch (error) {
    if (!missingRpc(error)) throw error;
    return createInvoiceFallback(month, lines);
  }
}

function missingStatusRpc(error: unknown) {
  return error instanceof SbError && (error.code === "PGRST202" || (error.status === 404 && error.body.includes("set_invoice_status")));
}

async function setStatusFallback(id: string, status: InvoiceStatus) {
  const invoice = await getInvoice(id);
  if (!invoice) throw new Error("ไม่พบใบแจ้งหนี้");
  const items = await listInvoiceItems(id);
  const rooms = await listRooms();
  const same = (a: number, b: number) => Math.abs(a - b) < 0.0001;
  if (status === "cancelled" && invoice.status !== "cancelled") {
    for (const item of items) {
      const room = rooms.find((entry) => entry.id === item.room_id);
      if (!room || !same(room.electric_meter, item.current_electric) || !same(room.water_meter, item.current_water)) {
        throw new Error(`ยกเลิกไม่ได้ เพราะมิเตอร์ห้อง ${item.room_no} ถูกใช้ต่อแล้ว`);
      }
    }
    for (const item of items) {
      await sb(`/rooms?id=eq.${item.room_id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          electric_meter: item.previous_electric,
          water_meter: item.previous_water,
          updated_at: new Date().toISOString(),
        }),
      });
    }
  } else if (invoice.status === "cancelled" && status !== "cancelled") {
    for (const item of items) {
      const room = rooms.find((entry) => entry.id === item.room_id);
      if (!room || !same(room.electric_meter, item.previous_electric) || !same(room.water_meter, item.previous_water)) {
        throw new Error(`เปิดบิลอีกครั้งไม่ได้ เพราะมิเตอร์ห้อง ${item.room_no} ไม่ตรงประวัติ`);
      }
    }
    for (const item of items) {
      await sb(`/rooms?id=eq.${item.room_id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          electric_meter: item.current_electric,
          water_meter: item.current_water,
          updated_at: new Date().toISOString(),
        }),
      });
    }
  }
  await sb(`/invoices?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status }),
  });
}

export async function deleteBuilding(id: string) {
  assertUuid(id);
  const rooms = await sb<{ id: string }[]>(`/rooms?building_id=eq.${id}&select=id&limit=1`);
  if (rooms.length > 0) throw new Error("ลบอาคารไม่ได้ เพราะยังมีห้องอยู่ ลบห้องก่อน");
  const invoices = await sb<{ id: string }[]>(`/invoices?building_id=eq.${id}&select=id&limit=1`);
  if (invoices.length > 0) throw new Error("ลบอาคารไม่ได้ เพราะยังมีใบแจ้งหนี้ของอาคารนี้");
  await sb(`/buildings?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

export async function deleteRoom(id: string) {
  assertUuid(id);
  const items = await sb<{ id: string }[]>(`/invoice_items?room_id=eq.${id}&select=id&limit=1`);
  if (items.length > 0) throw new Error("ลบห้องไม่ได้ เพราะมีใบแจ้งหนี้ของห้องนี้แล้ว ลบบิลก่อน");
  await sb(`/rooms?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

export async function deleteInvoice(id: string) {
  assertUuid(id);
  const invoice = await getInvoice(id);
  if (!invoice) throw new Error("ไม่พบใบแจ้งหนี้");
  if (invoice.status !== "cancelled") await setInvoiceStatus(id, "cancelled");
  await sb(`/invoice_items?invoice_id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  await sb(`/invoices?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus) {
  assertUuid(id);
  try {
    await sb("/rpc/set_invoice_status", {
      method: "POST",
      body: JSON.stringify({ p_id: id, p_status: status }),
    });
  } catch (error) {
    if (!missingStatusRpc(error)) throw error;
    await setStatusFallback(id, status);
  }
}
