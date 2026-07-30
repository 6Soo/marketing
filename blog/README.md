# foresttour.kr 블로그 단일 원천

`published/stories.json`은 foresttour.kr이 읽는 **공개 완료본**입니다. 초안 보관함이 아닙니다.
이 파일에 들어간 글은 앱이 1시간 이내에 읽어 공개할 수 있으므로, 아래 순서를 지킵니다.

1. `npm run blog:draft -- --series=<cardnews series> --slug=<stable-slug>`
2. `blog/drafts/<slug>.json`의 빈 본문·사진 권리·공식 출처명·관련 글을 사람이 검수
3. 연결 일정은 공개 예약 API의 정확한 상품 ID·제목 조건이 있을 때만 추가
4. `npm run blog:publish -- --draft=blog/drafts/<slug>.json --publish`
5. `npm run test:blog`
6. `published/stories.json`만 명시적으로 커밋·푸시

`blog:drafts/`는 gitignore 대상입니다. LLM이 만든 문장은 초안일 뿐이며, `photoStatus`,
공식 출처 URL, 촬영지·라이선스, 공개 일정의 사실을 자동으로 확정하지 않습니다.

foresttour.kr은 원격 파일을 읽기 전에 동일 계약을 다시 검증하고, 원격 장애나 검증 실패 시
예약 리포에 포함된 마지막 정상 스냅샷을 사용합니다. 예약 리포를 수정·커밋하는 봇은 없습니다.
