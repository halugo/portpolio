// Supabase Storage 공개 URL에서 버킷명과 경로를 역으로 추출한다.
// 예: https://xxxx.supabase.co/storage/v1/object/public/documents/123-abc-file.pdf
//     → { bucket: 'documents', path: '123-abc-file.pdf' }
function parseStorageUrl(url) {
  if (!url) return null;
  const match = String(url).match(/\/storage\/v1\/object\/public\/([^/]+)\/([^?]+)/);
  if (!match) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
}

/**
 * 더 이상 어떤 DB 레코드에서도 참조하지 않는 파일을 Storage에서 삭제한다.
 * 삭제 실패는 저장 자체를 막지 않도록 조용히 로그만 남긴다
 * (파일 정리가 실패했다고 콘텐츠 저장까지 실패 처리하면 관리자 입장에서 더 혼란스러움).
 */
async function deleteStorageFile(supabase, url) {
  const parsed = parseStorageUrl(url);
  if (!parsed) return;
  try {
    const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
    if (error) console.error('[storage cleanup] 삭제 실패:', url, error.message);
  } catch (err) {
    console.error('[storage cleanup] 삭제 중 오류:', url, err);
  }
}

/**
 * oldUrls 중 newUrls 집합에 더 이상 없는 것들을 전부 삭제한다.
 */
async function cleanupUnusedFiles(supabase, oldUrls, newUrls) {
  const newSet = new Set(newUrls);
  const targets = [...new Set(oldUrls)].filter((url) => url && !newSet.has(url));
  await Promise.all(targets.map((url) => deleteStorageFile(supabase, url)));
}

export { deleteStorageFile, cleanupUnusedFiles };
