import { verifySessionToken } from '../../lib/session.js';
import { getSessionCookie } from '../../lib/cookies.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET 요청만 허용됩니다.' });
  }

  const token = getSessionCookie(req.headers.cookie);
  const session = await verifySessionToken(token);

  if (!session) {
    return res.status(200).json({ authenticated: false });
  }
  return res.status(200).json({ authenticated: true, username: session.username, exp: session.exp });
}
