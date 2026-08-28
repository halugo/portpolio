import bcrypt from 'bcryptjs';
import { createSessionToken } from '../../lib/session.js';
import { serializeCookie, SESSION_COOKIE_NAME } from '../../lib/cookies.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 모두 입력해주세요.' });
  }

  const validUsername = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!validUsername || !passwordHash) {
    // 관리자 환경변수가 아직 설정되지 않은 경우 — 배포 설정 누락을 바로 알 수 있도록 명확히 응답
    return res.status(500).json({ error: '서버에 관리자 계정이 설정되어 있지 않습니다. Vercel 환경변수를 확인해주세요.' });
  }

  // 아이디는 평문 비교, 비밀번호는 bcrypt 해시와 비교 (평문 비밀번호는 서버 어디에도 저장하지 않음)
  const isUsernameValid = username === validUsername;
  const isPasswordValid = await bcrypt.compare(password, passwordHash);

  if (!isUsernameValid || !isPasswordValid) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const token = await createSessionToken(username);
  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, token, { maxAge: 3600 }));
  return res.status(200).json({ success: true });
}
