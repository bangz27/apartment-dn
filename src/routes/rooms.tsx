import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ConnectIssue, messageOf } from "@/components/connect-issue";
import { Shell } from "@/components/shell";
import { Button, Card, Empty, Field, Input, Select } from "@/components/ui";
import { listBuildings, listRooms, deleteRoom, saveRoom, type Room } from "@/lib/api";
import { meterText } from "@/lib/format";
import { useRefresh } from "@/lib/use-refresh";
import { useMounted } from "@/lib/use-mounted";

export const Route = createFileRoute("/rooms")({ component: RoomsPage });

function RoomsPage() {
  const mounted = useMounted();
  const refresh = useRefresh();
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: listBuildings, enabled: mounted });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: listRooms, enabled: mounted });
  const [draft, setDraft] = useState<Room | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryError = buildings.error ?? rooms.error;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await saveRoom({
        id: draft?.id,
        building_id: String(form.get("building_id") ?? ""),
        room_no: String(form.get("room_no") ?? ""),
        tenant_name: String(form.get("tenant_name") ?? ""),
        electric_meter: Number(form.get("electric_meter")),
        water_meter: Number(form.get("water_meter")),
      });
      setDraft(null);
      setCreating(false);
      await refresh();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!draft) return;
    setPending(true);
    setError(null);
    try {
      await deleteRoom(draft.id);
      setDraft(null);
      setCreating(false);
      setConfirmDelete(false);
      await refresh();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(false);
    }
  }

  const showForm = creating || draft;

  return (
    <Shell title="ห้อง">
      {!mounted || buildings.isPending || rooms.isPending ? <p className="text-sm text-muted">กำลังโหลด</p> : null}
      {queryError ? <ConnectIssue error={queryError} /> : null}
      {buildings.data && rooms.data && !queryError ? (
        <div className="flex flex-col gap-3">
          {showForm ? (
            <Card>
              <form className="flex flex-col gap-3" onSubmit={onSubmit}>
                <Field label="อาคาร">
                  <Select name="building_id" defaultValue={draft?.building_id ?? buildings.data[0]?.id ?? ""} required>
                    {buildings.data.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="เลขห้อง">
                  <Input name="room_no" defaultValue={draft?.room_no ?? ""} required />
                </Field>
                <Field label="ผู้เช่า">
                  <Input name="tenant_name" defaultValue={draft?.tenant_name ?? ""} placeholder="ว่างได้" />
                </Field>
                <Field label="มิเตอร์ไฟล่าสุด">
                  <Input name="electric_meter" inputMode="decimal" defaultValue={draft?.electric_meter ?? 0} required />
                </Field>
                <Field label="มิเตอร์น้ำล่าสุด">
                  <Input name="water_meter" inputMode="decimal" defaultValue={draft?.water_meter ?? 0} required />
                </Field>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                {draft && confirmDelete ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm">ลบห้อง {draft.room_no} ถาวร ห้องนี้จะหายจากรายการ</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" disabled={pending} onClick={() => setConfirmDelete(false)}>
                        กลับไปแก้
                      </Button>
                      <Button variant="danger" disabled={pending} onClick={onDelete}>
                        ลบห้อง
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDraft(null);
                        setCreating(false);
                        setConfirmDelete(false);
                        setError(null);
                      }}
                    >
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={pending || buildings.data.length === 0}>
                      บันทึก
                    </Button>
                  </div>
                )}
                {draft && !confirmDelete ? (
                  <Button variant="danger" disabled={pending} onClick={() => setConfirmDelete(true)}>
                    ลบห้อง
                  </Button>
                ) : null}
              </form>
            </Card>
          ) : (
            <Button
              disabled={buildings.data.length === 0}
              onClick={() => {
                setCreating(true);
                setDraft(null);
              }}
            >
              เพิ่มห้อง
            </Button>
          )}
          {buildings.data.length === 0 ? <Empty title="ยังไม่มีอาคาร" body="เพิ่มอาคารก่อน จึงจะเพิ่มห้องได้" /> : null}
          {rooms.data.length === 0 && buildings.data.length > 0 ? (
            <Empty title="ยังไม่มีห้อง" body="เพิ่มห้อง ระบุผู้เช่า และมิเตอร์ปัจจุบัน" />
          ) : null}
          {rooms.data.map((room) => {
            const building = buildings.data.find((item) => item.id === room.building_id);
            return (
              <button key={room.id} type="button" className="text-left" onClick={() => {
                setDraft(room);
                setCreating(false);
                setConfirmDelete(false);
                setError(null);
              }}>
                <Card>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-medium">ห้อง {room.room_no}</h2>
                    <span className="text-sm text-muted">{building?.name}</span>
                  </div>
                  <p className="text-sm">{room.tenant_name || "ว่าง"}</p>
                  <p className="mt-1 text-sm text-muted tabular-nums">
                    ไฟ {meterText(room.electric_meter)} · น้ำ {meterText(room.water_meter)}
                  </p>
                </Card>
              </button>
            );
          })}
        </div>
      ) : null}
    </Shell>
  );
}
