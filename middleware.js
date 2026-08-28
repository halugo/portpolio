import { verifySessionToken } from './lib/session.js';
import { getSessionCookie } from './lib/cookies.js';

// 세션이 없거나 만료된 상태로 관리자 대시보드에 접근하면 로그인 페이지로 돌려보낸다.
// (클라이언트 JS만으로 막으면 우회 가능하므로, 요청 단계에서 서버가 직접 막는다.)
//
// 주의: 이 프로젝트는 Next.js가 아닌 순수 정적 사이트 + 서버리스 함수 구성이라
// 'next/server'의 NextResponse를 쓰지 않고 표준 Web API(Request/Response)만 사용합니다.
// Response를 반환하지 않으면 원래 요청이 그대로 진행됩니다.
export const config = {
  matcher: ['/admin/dashboard.html', '/admin/content.html'],
};

export default async function middleware(request) {
  const token = getSessionCookie(request.headers.get('cookie'));
  const session = await verifySessionToken(token);

  if (!session) {
    return Response.redirect(new URL('/admin/index.html', request.url), 307);
  }
  // 세션이 유효하면 아무것도 반환하지 않고 통과시킨다.
}
