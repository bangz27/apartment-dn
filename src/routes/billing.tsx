import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ConnectIssue, messageOf } from "@/components/connect-issue";
import { Shell } from "@/components/shell";
import { Button, Card, Empty, Field, Input } from "@/components/ui";
import { createInvoice, listBuildings, listRooms, prepareLines, type PreparedLine, type Room } from "@/lib/api";
import { baht, currentMonthBangkok, meterText, thaiMonth } from "@/lib/format";
import { useRefresh } from "@/lib/use-refresh";
import { useMounted } from "@/lib/use-mounted";

export const Route = createFileRoute("/billing")({ component: BillingPage });

type Draft = { electric: string; water: string; checked: boolean };

function BillingPage() {
  const mounted = useMounted();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: listBuildings, enabled: mounted });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: listRooms, enabled: mounted });
  const [month, setMonth] = useState(currentMonthBangkok);
  const [buildingId, setBuildingId] = useState("");
  const [tenant, setTenant] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildingList = buildings.data ?? [];
  const roomList = rooms.data ?? [];
  const activeBuildingId = buildingId || buildingList[0]?.id || "";
  const building = buildingList.find((item) => item.id === activeBuildingId);
  const tenants = useMemo(() => {
    const map = new Map<string, Room[]>();
    for (const room of roomList) {
      if (room.building_id !== activeBuildingId || !room.tenant_name) continue;
      const list = map.get(room.tenant_name) ?? [];
      list.push(room);
      map.set(room.tenant_name, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "th"));
  }, [roomList, activeBuildingId]);
  const activeTenant = tenant || tenants[0]?.[0] || "";
  const tenantRooms = tenants.find((entry) => entry[0] === activeTenant)?.[1] ?? [];

  function draftOf(room: Room): Draft {
    return drafts[room.id] ?? { electric: "", water: "", checked: true };
  }

  const preview = useMemo(() => {
    if (!building) return { ok: false as const, message: "ยังไม่มีอาคาร" };
    const selected = tenantRooms.filter((room) => draftOf(room).checked);
    if (selected.length === 0) return { ok: false as const, message: "เลือกอย่างน้อย 1 ห้อง" };
    try {
      const lines = prepareLines(
        roomList,
        building,
        selected.map((room) => {
          const draft = draftOf(room);
          if (draft.electric.trim() === "" || draft.water.trim() === "") {
            throw new Error(`กรอกมิเตอร์ห้อง ${room.room_no}`);
          }
          return {
            room_id: room.id,
            current_electric: Number(draft.electric),
            current_water: Number(draft.water),
          };
        }),
      );
      const total = lines.reduce((sum, line) => sum + line.total, 0);
      return { ok: true as const, lines, total };
    } catch (err) {
      return { ok: false as const, message: messageOf(err) };
    }
    // draftOf closes over drafts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, tenantRooms, drafts, roomList]);

  async function onCreate() {
    if (!preview.ok) return;
    setPending(true);
    setError(null);
    try {
      const result = await createInvoice(
        month,
        preview.lines.map((line) => ({
          room_id: line.room.id,
          current_electric: line.currentElectric,
          current_water: line.currentWater,
        })),
      );
      await refresh();
      await navigate({ to: "/invoices/$invoiceId", params: { invoiceId: result.id } });
    } catch (err) {
      setError(messageOf(err));
      setConfirming(false);
    } finally {
      setPending(false);
    }
  }

  const queryError = buildings.error ?? rooms.error;

  return (
    <Shell title="เรียกเก็บ">
      {!mounted || buildings.isPending || rooms.isPending ? <p className="text-sm text-muted">กำลังโหลด</p> : null}
      {queryError ? <ConnectIssue error={queryError} /> : null}
      {buildings.data && rooms.data && !queryError ? (
        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-3">
            <Field label="เดือน">
              <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              {buildingList.map((item) => (
                <Button
                  key={item.id}
                  variant={item.id === activeBuildingId ? "primary" : "ghost"}
                  onClick={() => {
                    setBuildingId(item.id);
                    setTenant("");
                    setConfirming(false);
                  }}
                >
                  {item.name}
                </Button>
              ))}
            </div>
            {building ? (
              <p className="text-sm text-muted tabular-nums">
                ไฟ {building.electric_rate} บาท/หน่วย · น้ำ {building.water_rate} บาท/หน่วย · ค่าเช่า 1,500 · ขยะ 20
              </p>
            ) : null}
          </Card>
          {buildingList.length === 0 ? <Empty title="ยังไม่มีอาคาร" body="เพิ่มอาคารและห้องก่อนเรียกเก็บ" /> : null}
          {building && tenants.length === 0 ? <Empty title="ยังไม่มีผู้เช่าในอาคารนี้" body="ระบุชื่อผู้เช่าในหน้าห้องก่อน" /> : null}
          {tenants.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tenants.map(([name, list]) => (
                <Button
                  key={name}
                  variant={name === activeTenant ? "primary" : "ghost"}
                  onClick={() => {
                    setTenant(name);
                    setConfirming(false);
                  }}
                >
                  {name} · {list.length} ห้อง
                </Button>
              ))}
            </div>
          ) : null}
          <p className="text-sm text-muted">ติ๊กห้องที่จะรวมในบิลใบเดียวกัน ผู้เช่าคนเดียวเช่าหลายห้องได้</p>
          {tenantRooms.map((room) => {
            const draft = draftOf(room);
            return (
              <Card key={room.id}>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={draft.checked}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [room.id]: { ...draft, checked: event.target.checked } }))
                    }
                  />
                  <span className="font-medium">ห้อง {room.room_no}</span>
                </label>
                <p className="mt-2 text-sm text-muted tabular-nums">
                  มิเตอร์เดิม ไฟ {meterText(room.electric_meter)} · น้ำ {meterText(room.water_meter)}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Field label="ไฟปัจจุบัน">
                    <Input
                      inputMode="decimal"
                      value={draft.electric}
                      placeholder={String(room.electric_meter)}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [room.id]: { ...draft, electric: event.target.value } }))
                      }
                    />
                  </Field>
                  <Field label="น้ำปัจจุบัน">
                    <Input
                      inputMode="decimal"
                      value={draft.water}
                      placeholder={String(room.water_meter)}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [room.id]: { ...draft, water: event.target.value } }))
                      }
                    />
                  </Field>
                </div>
              </Card>
            );
          })}
          {preview.ok ? (
            <Card>
              {preview.lines.map((line) => (
                <LinePreview
                  key={line.room.id}
                  line={line}
                  electricRate={building?.electric_rate ?? 0}
                  waterRate={building?.water_rate ?? 0}
                />
              ))}
              <p className="mt-3 text-lg font-medium tabular-nums">รวม {baht(preview.total)}</p>
            </Card>
          ) : (
            <p className="text-sm text-muted">{preview.message}</p>
          )}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {confirming && preview.ok ? (
            <Card>
              <p>
                สร้างใบแจ้งหนี้ 1 ใบ ให้ {activeTenant} จำนวน {preview.lines.length} ห้อง เดือน {thaiMonth(month)} รวม{" "}
                {baht(preview.total)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  กลับไปแก้
                </Button>
                <Button disabled={pending} onClick={onCreate}>
                  ยืนยัน
                </Button>
              </div>
            </Card>
          ) : (
            <Button disabled={!preview.ok} onClick={() => setConfirming(true)}>
              สร้างใบแจ้งหนี้
            </Button>
          )}
        </div>
      ) : null}
    </Shell>
  );
}

function LinePreview({
  line,
  electricRate,
  waterRate,
}: {
  line: PreparedLine;
  electricRate: number;
  waterRate: number;
}) {
  return (
    <div className="border-b border-line py-2 text-sm last:border-b-0">
      <p className="font-medium">ห้อง {line.room.room_no}</p>
      <p className="text-muted tabular-nums">
        ไฟ {meterText(line.electricUsage)} หน่วย × {meterText(electricRate)} = {baht(line.electricAmount)}
      </p>
      <p className="text-muted tabular-nums">
        น้ำ {meterText(line.waterUsage)} หน่วย × {meterText(waterRate)} = {baht(line.waterAmount)}
      </p>
      <p className="tabular-nums">รวมห้อง {baht(line.total)}</p>
    </div>
  );
}
