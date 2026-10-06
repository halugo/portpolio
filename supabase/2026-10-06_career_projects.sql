-- 경력 항목에 "주요 프로젝트" 추가 (2026-10-06)
-- Supabase 대시보드 > SQL Editor에서 1회 실행. 여러 번 실행해도 안전함(if not exists).
alter table public.career_items
  add column if not exists has_projects boolean not null default false,
  add column if not exists projects text[] not null default '{}';
