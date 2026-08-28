// Supabase/Postgres가 던지는 기술적인 에러 메시지를, 관리자가 바로 이해하고
// 대응할 수 있는 한국어 메시지로 바꿔준다. 원본 메시지는 서버 로그(console.error)에
// 그대로 남기고, 화면에는 이 함수가 반환한 문구만 보여준다.
function toFriendlyMessage(rawMessage) {
  const msg = String(rawMessage || '');

  if (/does not exist/i.test(msg) && /column/i.test(msg)) {
    return '데이터베이스 테이블 구조가 최신 상태가 아닙니다. Supabase에서 스키마(schema.sql)를 다시 확인해주세요.';
  }
  if (/does not exist/i.test(msg) && /(relation|table)/i.test(msg)) {
    return '필요한 테이블을 찾을 수 없습니다. Supabase에서 schema.sql이 정상적으로 실행됐는지 확인해주세요.';
  }
  if (/permission denied/i.test(msg)) {
    return '데이터베이스 접근 권한 문제가 발생했습니다. Vercel의 SUPABASE_SERVICE_ROLE_KEY 값을 다시 확인해주세요.';
  }
  if (/duplicate key/i.test(msg)) {
    return '이미 존재하는 데이터와 충돌했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (/invalid api key|jwt/i.test(msg)) {
    return 'Supabase 연결 정보가 올바르지 않습니다. config.js와 Vercel 환경변수의 키 값을 다시 확인해주세요.';
  }
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
    return '네트워크 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
  }
  if (/환경변수/i.test(msg)) {
    return msg; // 이미 우리가 직접 작성한 한국어 안내문이므로 그대로 사용
  }
  return '저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주시고, 계속되면 어느 항목에서 발생했는지와 함께 문의해주세요.';
}

export { toFriendlyMessage };
