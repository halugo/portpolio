import { verifySessionToken } from './session.js';
import { getSessionCookie } from './cookies.js';

/**
 * 관리자 전용 API 라우트 앞단에서 세션을 확인한다.
 * 유효하지 않으면 401 응답을 직접 보내고 true를 반환한다(호출부에서 바로 return 하면 됨).
 * 유효하면 false를 반환한다.
 *
 * 사용 예:
 *   if (await rejectIfUnauthorized(req, res)) return;
 */
async function rejectIfUnauthorized(req, res) {
  const token = getSessionCookie(req.headers.cookie);
  const session = await verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: '로그인이 필요합니다. 세션이 만료됐을 수 있습니다.' });
    return true;
  }
  return false;
}

export { rejectIfUnauthorized };
