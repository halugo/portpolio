import { createClient } from '@supabase/supabase-js';

// service_role 키는 RLS를 우회하므로, 반드시 서버(api/*.js) 안에서만 사용합니다.
// 브라우저로 내려가는 코드(index.html, admin/dashboard.html)에는 절대 이 키를 넣지 마세요.
let cachedClient = null;

function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다.');
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

export { getSupabaseAdmin };
