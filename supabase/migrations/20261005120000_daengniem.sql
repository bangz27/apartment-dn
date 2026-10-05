-- Daengniem schema. Safe to re-run. Does not drop tables or delete rows.

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  water_rate numeric not null,
  electric_rate numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buildings_rates_nonneg check (water_rate >= 0 and electric_rate >= 0)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete restrict,
  room_no text not null,
  tenant_name text,
  electric_meter numeric not null default 0,
  water_meter numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_meters_nonneg check (electric_meter >= 0 and water_meter >= 0)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no bigint generated always as identity unique,
  month text not null,
  building_id uuid not null references public.buildings (id) on delete restrict,
  tenant_name text,
  total numeric not null default 0,
  status text not null default 'due',
  created_at timestamptz not null default now(),
  constraint invoices_status_check check (status in ('due', 'paid', 'cancelled'))
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  room_id uuid not null references public.rooms (id) on delete restrict,
  room_no text not null,
  tenant_name text not null,
  previous_electric numeric not null,
  current_electric numeric not null,
  electric_usage numeric not null,
  electric_amount numeric not null,
  previous_water numeric not null,
  current_water numeric not null,
  water_usage numeric not null,
  water_amount numeric not null,
  rent numeric not null,
  garbage numeric not null,
  total numeric not null,
  constraint invoice_items_formula check (
    current_electric >= previous_electric
    and current_water >= previous_water
    and electric_usage = current_electric - previous_electric
    and water_usage = current_water - previous_water
    and rent = 1500
    and garbage = 20
    and total = rent + electric_amount + water_amount + garbage
  )
);

create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index if not exists invoice_items_room_id_idx on public.invoice_items (room_id);
create index if not exists invoices_building_id_idx on public.invoices (building_id);
create index if not exists rooms_building_id_idx on public.rooms (building_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

drop trigger if exists buildings_touch on public.buildings;
create trigger buildings_touch before update on public.buildings
for each row execute function public.touch_updated_at();

drop trigger if exists rooms_touch on public.rooms;
create trigger rooms_touch before update on public.rooms
for each row execute function public.touch_updated_at();

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.buildings, public.rooms, public.invoices, public.invoice_items to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

alter table public.buildings enable row level security;
alter table public.rooms enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists prototype_all on public.buildings;
create policy prototype_all on public.buildings for all to anon, authenticated using (true) with check (true);
drop policy if exists prototype_all on public.rooms;
create policy prototype_all on public.rooms for all to anon, authenticated using (true) with check (true);
drop policy if exists prototype_all on public.invoices;
create policy prototype_all on public.invoices for all to anon, authenticated using (true) with check (true);
drop policy if exists prototype_all on public.invoice_items;
create policy prototype_all on public.invoice_items for all to anon, authenticated using (true) with check (true);

insert into public.buildings (name, electric_rate, water_rate)
select v.name, v.electric_rate, v.water_rate
from (
  values
    ('อาคาร 1'::text, 7::numeric, 13::numeric),
    ('อาคาร 2', 10, 15)
) as v(name, electric_rate, water_rate)
where not exists (select 1 from public.buildings);

drop function if exists public.create_rent_invoice(text, jsonb);
create function public.create_rent_invoice(p_month text, p_room_lines jsonb)
returns jsonb
language plpgsql
set search_path = public
as $fn$
declare
  v_rent constant numeric := 1500;
  v_garbage constant numeric := 20;
  v_building uuid;
  v_tenant text;
  v_electric_rate numeric;
  v_water_rate numeric;
  v_invoice uuid;
  v_no bigint;
  v_total numeric := 0;
  v_line jsonb;
  v_room public.rooms%rowtype;
  v_cur_e numeric;
  v_cur_w numeric;
  v_use_e numeric;
  v_use_w numeric;
  v_amt_e numeric;
  v_amt_w numeric;
  v_line_total numeric;
  v_ids uuid[];
begin
  if p_month is null or btrim(p_month) = '' or btrim(p_month) !~ '^\d{4}-\d{2}$' then
    raise exception 'รูปแบบเดือนไม่ถูกต้อง';
  end if;
  if p_room_lines is null or jsonb_typeof(p_room_lines) <> 'array' or jsonb_array_length(p_room_lines) = 0 then
    raise exception 'กรุณาเลือกอย่างน้อย 1 ห้อง';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_room_lines) as x
    where coalesce(x->>'room_id', '') !~* '^[0-9a-f-]{36}$'
      or coalesce(x->>'current_electric', '') !~ '^-?[0-9]+(\.[0-9]+)?$'
      or coalesce(x->>'current_water', '') !~ '^-?[0-9]+(\.[0-9]+)?$'
  ) then
    raise exception 'ข้อมูลมิเตอร์ไม่ครบ';
  end if;

  select coalesce(array_agg((x->>'room_id')::uuid), '{}')
    into v_ids
  from jsonb_array_elements(p_room_lines) as x;

  if (select count(*) from unnest(v_ids)) <> (select count(distinct u) from unnest(v_ids) as u) then
    raise exception 'เลือกห้องซ้ำ';
  end if;

  perform 1 from public.rooms where id = any (v_ids) for update;

  if (select count(*) from public.rooms where id = any (v_ids)) <> cardinality(v_ids) then
    raise exception 'ไม่พบห้องที่เลือก';
  end if;
  if exists (
    select 1 from public.rooms
    where id = any (v_ids) and (tenant_name is null or btrim(tenant_name) = '')
  ) then
    raise exception 'มีห้องที่ยังไม่มีชื่อผู้เช่า';
  end if;
  if (select count(distinct building_id) from public.rooms where id = any (v_ids)) <> 1 then
    raise exception 'ห้องในใบเดียวกันต้องอยู่อาคารเดียวกัน';
  end if;
  if (select count(distinct btrim(tenant_name)) from public.rooms where id = any (v_ids)) <> 1 then
    raise exception 'ผู้เช่าต้องเป็นคนเดียวกันในใบแจ้งหนี้เดียว';
  end if;
  if exists (
    select 1
    from public.invoice_items as ii
    join public.invoices as i on i.id = ii.invoice_id
    where ii.room_id = any (v_ids)
      and i.month = btrim(p_month)
      and i.status <> 'cancelled'
  ) then
    raise exception 'มีใบแจ้งหนี้ของห้องนี้ในเดือนนี้อยู่แล้ว';
  end if;

  select building_id, btrim(tenant_name)
    into v_building, v_tenant
  from public.rooms
  where id = any (v_ids)
  limit 1;

  select electric_rate, water_rate
    into v_electric_rate, v_water_rate
  from public.buildings
  where id = v_building;

  insert into public.invoices (month, building_id, tenant_name, total, status)
  values (btrim(p_month), v_building, v_tenant, 0, 'due')
  returning id, invoice_no into v_invoice, v_no;

  for v_line in select value from jsonb_array_elements(p_room_lines)
  loop
    select * into v_room from public.rooms where id = (v_line->>'room_id')::uuid;
    v_cur_e := (v_line->>'current_electric')::numeric;
    v_cur_w := (v_line->>'current_water')::numeric;
    if v_cur_e < v_room.electric_meter then
      raise exception 'มิเตอร์ไฟปัจจุบันน้อยกว่ามิเตอร์เดิม ห้อง %', v_room.room_no;
    end if;
    if v_cur_w < v_room.water_meter then
      raise exception 'มิเตอร์น้ำปัจจุบันน้อยกว่ามิเตอร์เดิม ห้อง %', v_room.room_no;
    end if;
    v_use_e := v_cur_e - v_room.electric_meter;
    v_use_w := v_cur_w - v_room.water_meter;
    v_amt_e := v_use_e * v_electric_rate;
    v_amt_w := v_use_w * v_water_rate;
    v_line_total := v_rent + v_amt_e + v_amt_w + v_garbage;
    v_total := v_total + v_line_total;
    insert into public.invoice_items (
      invoice_id, room_id, room_no, tenant_name,
      previous_electric, current_electric, electric_usage, electric_amount,
      previous_water, current_water, water_usage, water_amount,
      rent, garbage, total
    ) values (
      v_invoice, v_room.id, v_room.room_no, btrim(v_room.tenant_name),
      v_room.electric_meter, v_cur_e, v_use_e, v_amt_e,
      v_room.water_meter, v_cur_w, v_use_w, v_amt_w,
      v_rent, v_garbage, v_line_total
    );
    update public.rooms
      set electric_meter = v_cur_e,
          water_meter = v_cur_w
    where id = v_room.id;
  end loop;

  update public.invoices set total = v_total where id = v_invoice;
  return jsonb_build_object('id', v_invoice, 'invoice_no', v_no, 'total', v_total);
end;
$fn$;

drop function if exists public.set_invoice_status(uuid, text);
create function public.set_invoice_status(p_id uuid, p_status text)
returns jsonb
language plpgsql
set search_path = public
as $fn$
declare
  v_old text;
  v_item public.invoice_items%rowtype;
  v_updated int;
begin
  if p_status not in ('due', 'paid', 'cancelled') then
    raise exception 'สถานะไม่ถูกต้อง';
  end if;
  select status into v_old from public.invoices where id = p_id for update;
  if not found then
    raise exception 'ไม่พบใบแจ้งหนี้';
  end if;
  if v_old = p_status then
    return jsonb_build_object('id', p_id, 'status', p_status);
  end if;

  if p_status = 'cancelled' and v_old <> 'cancelled' then
    for v_item in select * from public.invoice_items where invoice_id = p_id
    loop
      update public.rooms
        set electric_meter = v_item.previous_electric,
            water_meter = v_item.previous_water
      where id = v_item.room_id
        and electric_meter = v_item.current_electric
        and water_meter = v_item.current_water;
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'ยกเลิกไม่ได้ เพราะมิเตอร์ห้อง % ถูกใช้ต่อแล้ว', v_item.room_no;
      end if;
    end loop;
  elsif v_old = 'cancelled' and p_status <> 'cancelled' then
    for v_item in select * from public.invoice_items where invoice_id = p_id
    loop
      update public.rooms
        set electric_meter = v_item.current_electric,
            water_meter = v_item.current_water
      where id = v_item.room_id
        and electric_meter = v_item.previous_electric
        and water_meter = v_item.previous_water;
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'เปิดบิลอีกครั้งไม่ได้ เพราะมิเตอร์ห้อง % ไม่ตรงประวัติ', v_item.room_no;
      end if;
    end loop;
  end if;

  update public.invoices set status = p_status where id = p_id;
  return jsonb_build_object('id', p_id, 'status', p_status);
end;
$fn$;

revoke all on function public.create_rent_invoice(text, jsonb) from public;
revoke all on function public.set_invoice_status(uuid, text) from public;
grant execute on function public.create_rent_invoice(text, jsonb) to anon, authenticated, service_role;
grant execute on function public.set_invoice_status(uuid, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
