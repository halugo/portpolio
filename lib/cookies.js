// 최소한의 쿠키 직렬화/파싱 헬퍼 (별도 패키지 의존성 없이 직접 구현)

const SESSION_COOKIE_NAME = 'admin_session';

/**
 * Set-Cookie 헤더 값 문자열을 만든다.
 * @param {string} name
 * @param {string} value
 * @param {{ maxAge?: number }} options  maxAge(초). 0이면 즉시 만료(로그아웃용)
 */
function serializeCookie(name, value, { maxAge } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push('Path=/');
  parts.push('HttpOnly');
  parts.push('Secure');       // https 환경(배포/미리보기)에서만 전송됨
  parts.push('SameSite=Strict');
  if (typeof maxAge === 'number') {
    parts.push(`Max-Age=${maxAge}`);
  }
  return parts.join('; ');
}

/**
 * 요청 헤더의 Cookie 문자열에서 admin_session 값을 추출한다.
 * @param {string | undefined} cookieHeader
 */
function getSessionCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(SESSION_COOKIE_NAME.length + 1));
}

export { SESSION_COOKIE_NAME, serializeCookie, getSessionCookie };
