
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mmyrsouqnuevyoxxryso.supabase.co';
const supabaseKey = 'sb_publishable__aPsUxL63ASkPODr2GPARA_1BMEoQ4W';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * SUPABASE SQL SETUP (Run this in your Supabase SQL Editor):
 * 
 * create table todos (
 *   id uuid default gen_random_uuid() primary key,
 *   title text not null,
 *   is_completed boolean default false,
 *   priority text check (priority in ('low', 'medium', 'high')) default 'medium',
 *   created_at timestamp with time zone default now(),
 *   due_date timestamp with time zone
 * );
 * 
 * -- Enable Row Level Security (optional for demo, recommended for production)
 * alter table todos enable row level security;
 * 
 * create policy "Public Access" on todos
 *   for all using (true) with check (true);
 */
