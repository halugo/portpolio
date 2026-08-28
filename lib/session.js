import { SignJWT, jwtVerify } from 'jose';

const SESSION_DURATION = '1h'; // 세션 만료 시간: 1시간

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET 환경변수가 설정되어 있지 않습니다.');
  }
  return new TextEncoder().encode(secret);
}

/**
 * 관리자 세션 JWT를 발급한다. (로그인 성공 시 호출)
 * @param {string} username
 * @returns {Promise<string>} 서명된 JWT 문자열
 */
async function createSessionToken(username) {
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

/**
 * 세션 JWT를 검증한다. 유효하지 않거나 만료됐으면 null을 반환한다.
 * @param {string | null | undefined} token
 * @returns {Promise<{ username: string, exp: number } | null>}
 */
async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return { username: payload.sub, exp: payload.exp };
  } catch {
    // 서명 불일치, 만료(exp 초과) 등 — 이유 불문하고 비인증 처리
    return null;
  }
}

export { createSessionToken, verifySessionToken, SESSION_DURATION };
