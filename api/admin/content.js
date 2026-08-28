import { rejectIfUnauthorized } from '../../lib/requireAdmin.js';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.js';
import { toFriendlyMessage } from '../../lib/friendlyError.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET 요청만 허용됩니다.' });
  }
  if (await rejectIfUnauthorized(req, res)) return;

  const supabase = getSupabaseAdmin();

  const [siteContent, career, portfolio, portfolioImages, sns] = await Promise.all([
    supabase.from('site_content').select('*').limit(1).maybeSingle(),
    supabase.from('career_items').select('*').order('sort_order', { ascending: true }),
    supabase.from('portfolio_items').select('*').order('sort_order', { ascending: true }),
    supabase.from('portfolio_images').select('*').order('sort_order', { ascending: true }),
    supabase.from('sns_links').select('*').order('sort_order', { ascending: true }),
  ]);

  const firstError = [siteContent, career, portfolio, portfolioImages, sns].find((r) => r.error);
  if (firstError) {
    console.error('[content] 조회 실패:', firstError.error);
    return res.status(500).json({ error: `콘텐츠를 불러오지 못했습니다 — ${toFriendlyMessage(firstError.error.message)}` });
  }

  // portfolio_items에 해당 이미지들을 묶어서 내려준다 (프론트에서 다루기 쉽게)
  const portfolioWithImages = (portfolio.data || []).map((item) => ({
    ...item,
    images: (portfolioImages.data || [])
      .filter((img) => img.portfolio_id === item.id)
      .map((img) => ({ image_url: img.image_url, sort_order: img.sort_order })),
  }));

  return res.status(200).json({
    site_content: siteContent.data || {},
    career_items: career.data || [],
    portfolio_items: portfolioWithImages,
    sns_links: sns.data || [],
  });
}
