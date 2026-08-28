import { rejectIfUnauthorized } from '../../lib/requireAdmin.js';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.js';
import { toFriendlyMessage } from '../../lib/friendlyError.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  if (await rejectIfUnauthorized(req, res)) return;

  const body = req.body || {};
  const { site_content, career_items, portfolio_items, sns_links } = body;

  if (!site_content || !Array.isArray(career_items) || !Array.isArray(portfolio_items) || !Array.isArray(sns_links)) {
    return res.status(400).json({ error: '입력한 내용의 형식이 올바르지 않습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.' });
  }

  const supabase = getSupabaseAdmin();

  // 어느 구간(내소개/경력/포트폴리오/SNS)에서 실패했는지 관리자가 알 수 있도록
  // 한글 라벨과 함께 감싸고, 실제 원인은 friendlyError로 변환해서 보여준다.
  async function step(label, fn) {
    try {
      await fn();
    } catch (err) {
      console.error(`[save] ${label} 실패:`, err); // 원본 에러는 Vercel 로그에서 확인 가능
      throw new Error(`${label} 저장 중 문제가 발생했습니다 — ${toFriendlyMessage(err.message)}`);
    }
  }

  try {
    // ---------------------------------------------------------
    // 1) site_content : 항상 1행만 존재 → id 기준으로 update
    // ---------------------------------------------------------
    await step('내소개', async () => {
      if (!site_content.id) {
        throw new Error('site_content.id가 없습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.');
      }
      const { id, updated_at, ...siteFields } = site_content;
      const { error } = await supabase
        .from('site_content')
        .update({ ...siteFields, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    });

    // ---------------------------------------------------------
    // 2) career_items : 기존 행 전부 삭제 후 새로 삽입
    // ---------------------------------------------------------
    await step('경력', async () => {
      const { error: deleteError } = await supabase.from('career_items').delete().not('id', 'is', null);
      if (deleteError) throw new Error(deleteError.message);

      if (career_items.length > 0) {
        const careerRows = career_items.map((item, index) => ({
          company_name: item.company_name,
          period_text: item.period_text,
          duties: Array.isArray(item.duties) ? item.duties : [],
          sort_order: index,
        }));
        const { error: insertError } = await supabase.from('career_items').insert(careerRows);
        if (insertError) throw new Error(insertError.message);
      }
    });

    // ---------------------------------------------------------
    // 3) portfolio_items (+ portfolio_images) : 전체 교체
    // ---------------------------------------------------------
    await step('포트폴리오', async () => {
      const { error: deleteError } = await supabase.from('portfolio_items').delete().not('id', 'is', null);
      if (deleteError) throw new Error(deleteError.message);

      if (portfolio_items.length === 0) return;

      const portfolioRows = portfolio_items.map((item, index) => ({
        title: item.title,
        description: item.description || '',
        preview_type: item.preview_type || null,
        pdf_file_url: item.pdf_file_url || null,
        download_file_url: item.download_file_url || null,
        download_file_name: item.download_file_name || null,
        sort_order: index,
      }));
      const { data: insertedPortfolio, error: insertError } = await supabase
        .from('portfolio_items')
        .insert(portfolioRows)
        .select('id, sort_order');
      if (insertError) throw new Error(insertError.message);

      // 반환된 배열의 순서에 기대지 않고, sort_order 값으로 새로 생성된 id를 명시적으로 매칭한다.
      const idBySortOrder = new Map((insertedPortfolio || []).map((row) => [row.sort_order, row.id]));

      const imageRows = [];
      portfolio_items.forEach((item, index) => {
        const newId = idBySortOrder.get(index);
        if (!newId || !Array.isArray(item.images)) return;
        item.images.forEach((img, imgIndex) => {
          imageRows.push({ portfolio_id: newId, image_url: img.image_url, sort_order: imgIndex });
        });
      });
      if (imageRows.length > 0) {
        const { error: imageError } = await supabase.from('portfolio_images').insert(imageRows);
        if (imageError) throw new Error(imageError.message);
      }
    });

    // ---------------------------------------------------------
    // 4) sns_links : 전체 교체
    // ---------------------------------------------------------
    await step('SNS 링크', async () => {
      const { error: deleteError } = await supabase.from('sns_links').delete().not('id', 'is', null);
      if (deleteError) throw new Error(deleteError.message);

      if (sns_links.length > 0) {
        const snsRows = sns_links.map((item, index) => ({
          label: item.label || '',
          icon_url: item.icon_url || null,
          link_url: item.link_url || null,
          sort_order: index,
        }));
        const { error: insertError } = await supabase.from('sns_links').insert(snsRows);
        if (insertError) throw new Error(insertError.message);
      }
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
