-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  tier text default 'free',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policy for reading own profile
create policy "Users can read own profile"
  on public.profiles for select
  using ( auth.uid() = id );

-- Create trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at
  before update on public.profiles
  for each row
  execute function update_updated_at_column();
