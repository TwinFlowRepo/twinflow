-- Companies (tenants). Each customer company that signs up gets one row.
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- One profile per auth user, scoped to exactly one company.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  full_name text not null,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now()
);

create index profiles_company_id_idx on profiles (company_id);

-- The CRM's customer database: each row is a contact/customer belonging to one company.
create table customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_company_id_idx on customers (company_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_set_updated_at
  before update on customers
  for each row
  execute function set_updated_at();

-- Resolves the calling user's company_id for use in RLS policies.
create or replace function my_company_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select company_id from profiles where id = auth.uid();
$$;

alter table companies enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;

create policy "members can read their own company"
  on companies for select
  using (id = my_company_id());

create policy "members can read profiles in their company"
  on profiles for select
  using (company_id = my_company_id());

create policy "users can read their own profile"
  on profiles for select
  using (id = auth.uid());

create policy "members can read their company's customers"
  on customers for select
  using (company_id = my_company_id());

create policy "members can insert customers into their company"
  on customers for insert
  with check (company_id = my_company_id());

create policy "members can update their company's customers"
  on customers for update
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "members can delete their company's customers"
  on customers for delete
  using (company_id = my_company_id());

-- Atomic self-service signup: creates the company and the first profile (owner) together.
-- Called right after supabase.auth.signUp() succeeds, with the new user's session active.
create or replace function create_company_with_owner(
  p_company_name text,
  p_company_slug text,
  p_full_name text
)
returns companies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company companies;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'user already belongs to a company';
  end if;

  insert into companies (name, slug)
  values (p_company_name, p_company_slug)
  returning * into v_company;

  insert into profiles (id, company_id, full_name, role)
  values (auth.uid(), v_company.id, p_full_name, 'owner');

  return v_company;
end;
$$;
