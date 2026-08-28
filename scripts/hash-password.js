// 관리자 비밀번호를 bcrypt 해시로 변환하는 스크립트.
// 실제 비밀번호는 이 스크립트를 실행하는 본인 컴퓨터에서만 처리되고,
// 코드/깃 저장소에는 해시값만 남습니다 (Vercel 환경변수 ADMIN_PASSWORD_HASH에 등록).
//
// 사용법:
//   npm install            (최초 1회, bcryptjs 설치)
//   npm run hash-password -- "원하는비밀번호"

import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('사용법: npm run hash-password -- "원하는비밀번호"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\n아래 값을 Vercel 프로젝트의 환경변수 ADMIN_PASSWORD_HASH 에 그대로 등록하세요:\n');
console.log(hash);
console.log('');
