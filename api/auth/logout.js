import { serializeCookie, SESSION_COOKIE_NAME } from '../../lib/cookies.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  // Max-Age=0으로 즉시 만료시켜 브라우저에서 쿠키를 삭제시킨다.
  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, '', { maxAge: 0 }));
  return res.status(200).json({ success: true });
}
