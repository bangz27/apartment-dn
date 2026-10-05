import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ConnectIssue, messageOf } from "@/components/connect-issue";
import { Shell } from "@/components/shell";
import { Button, Card, Empty, Field, Input } from "@/components/ui";
import { deleteBuilding, listBuildings, saveBuilding, seedOfficialBuildings, type Building } from "@/lib/api";
import { useRefresh } from "@/lib/use-refresh";
import { useMounted } from "@/lib/use-mounted";

export const Route = createFileRoute("/buildings")({ component: BuildingsPage });

function BuildingsPage() {
  const mounted = useMounted();
  const refresh = useRefresh();
  const query = useQuery({ queryKey: ["buildings"], queryFn: listBuildings, enabled: mounted });
  const [draft, setDraft] = useState<Building | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await saveBuilding({
        id: draft?.id,
        name: String(form.get("name") ?? ""),
        electric_rate: Number(form.get("electric_rate")),
        water_rate: Number(form.get("water_rate")),
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

  async function onSeed() {
    setPending(true);
    setError(null);
    try {
      await seedOfficialBuildings();
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
      await deleteBuilding(draft.id);
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
    <Shell title="อาคาร">
      {!mounted || query.isPending ? <p className="text-sm text-muted">กำลังโหลด</p> : null}
      {query.isError ? <ConnectIssue error={query.error} /> : null}
      {query.data ? (
        <div className="flex flex-col gap-3">
          {showForm ? (
            <Card>
              <form className="flex flex-col gap-3" onSubmit={onSubmit}>
                <Field label="ชื่ออาคาร">
                  <Input name="name" defaultValue={draft?.name ?? ""} required />
                </Field>
                <Field label="ค่าไฟต่อหน่วย">
                  <Input name="electric_rate" inputMode="decimal" defaultValue={draft?.electric_rate ?? 7} required />
                </Field>
                <Field label="ค่าน้ำต่อหน่วย">
                  <Input name="water_rate" inputMode="decimal" defaultValue={draft?.water_rate ?? 13} required />
                </Field>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                {draft && confirmDelete ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm">ลบ {draft.name} ถาวร อาคารนี้จะหายจากรายการ</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" disabled={pending} onClick={() => setConfirmDelete(false)}>
                        กลับไปแก้
                      </Button>
                      <Button variant="danger" disabled={pending} onClick={onDelete}>
                        ลบอาคาร
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
                    <Button type="submit" disabled={pending}>
                      บันทึก
                    </Button>
                  </div>
                )}
                {draft && !confirmDelete ? (
                  <Button variant="danger" disabled={pending} onClick={() => setConfirmDelete(true)}>
                    ลบอาคาร
                  </Button>
                ) : null}
              </form>
            </Card>
          ) : (
            <Button
              onClick={() => {
                setCreating(true);
                setDraft(null);
              }}
            >
              เพิ่มอาคาร
            </Button>
          )}
          {query.data.length === 0 && !showForm ? (
            <Empty title="ยังไม่มีอาคาร" body="อาคาร 1 ค่าไฟ 7 ค่าน้ำ 13 · อาคาร 2 ค่าไฟ 10 ค่าน้ำ 15" />
          ) : null}
          {query.data.length === 0 ? (
            <Button variant="ghost" disabled={pending} onClick={onSeed}>
              ใส่อาคาร 1 และ 2 ตามสูตร
            </Button>
          ) : null}
          {error && !showForm ? <p className="text-sm text-danger">{error}</p> : null}
          {query.data.map((building) => (
            <button key={building.id} type="button" className="text-left" onClick={() => {
                setDraft(building);
                setCreating(false);
                setConfirmDelete(false);
                setError(null);
              }}>
              <Card>
                <h2 className="font-medium">{building.name}</h2>
                <p className="mt-1 text-sm text-muted tabular-nums">
                  ไฟ {building.electric_rate} บาท/หน่วย · น้ำ {building.water_rate} บาท/หน่วย
                </p>
              </Card>
            </button>
          ))}
        </div>
      ) : null}
    </Shell>
  );
}
