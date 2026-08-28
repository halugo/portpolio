// 이미지 파일을 webp로 변환한다 (브라우저에서, 업로드 전에).
export async function convertImageToWebp(file, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob) throw new Error('이미지를 webp로 변환하지 못했습니다.');
  return blob;
}

// 서버에서 서명된 업로드 URL을 발급받고, Supabase Storage로 파일을 직접 업로드한다.
// (파일 바이트가 Vercel 함수를 거치지 않으므로 대용량 PDF도 안전하게 처리됨)
export async function uploadToSupabase(supabaseClient, bucket, fileNameHint, fileOrBlob) {
  const res = await fetch('/api/admin/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, fileName: fileNameHint }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '업로드 URL 발급에 실패했습니다.');

  const { error } = await supabaseClient.storage
    .from(bucket)
    .uploadToSignedUrl(data.path, data.token, fileOrBlob);
  if (error) throw new Error(`파일 업로드에 실패했습니다. 잠시 후 다시 시도해주세요. (${error.message})`);

  return data.publicUrl;
}
