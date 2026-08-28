import { rejectIfUnauthorized } from '../../lib/requireAdmin.js';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.js';
import { toFriendlyMessage } from '../../lib/friendlyError.js';

const ALLOWED_BUCKETS = new Set(['portfolio-images', 'documents', 'sns-icons']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  if (await rejectIfUnauthorized(req, res)) return;

  const { bucket, fileName } = req.body || {};
  if (!bucket || !fileName) {
    return res.status(400).json({ error: '파일 정보가 올바르지 않습니다. 다시 시도해주세요.' });
  }
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return res.status(400).json({ error: '허용되지 않은 파일 저장 위치입니다. 페이지를 새로고침한 뒤 다시 시도해주세요.' });
  }

  // 파일명 충돌 방지 + 경로 탈출 방지 (../ 같은 입력 차단)
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);

  if (error) {
    console.error('[upload-url] 발급 실패:', error);
    return res.status(500).json({ error: `업로드 준비 중 문제가 발생했습니다 — ${toFriendlyMessage(error.message)}` });
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);

  return res.status(200).json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl: publicUrlData.publicUrl,
  });
}
