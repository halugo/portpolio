// anon key는 RLS(공개 읽기 정책)로 보호되므로 브라우저에 노출돼도 안전합니다.
// service_role 키는 절대 이 파일에 넣지 마세요 (서버 전용, lib/supabaseAdmin.js에서만 사용).
window.SUPABASE_CONFIG = {
  url: 'https://tcfvreksycbcfyycxbmt.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjZnZyZWtzeWNiY2Z5eWN4Ym10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NzMyNTQsImV4cCI6MjEwMzQ0OTI1NH0.Z00pF_jscSeRq8s2AR3ji3LznBHxCKlx91dhjXwc1zE',
};
