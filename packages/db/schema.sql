create table if not exists healthcheck (
  id serial primary key,
  service text not null,
  created_at timestamptz default now()
);
