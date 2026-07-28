# BAND 운영 로그 표준 양식 (TEMPLATE)

본 양식은 네이버 밴드 외부 운영 작업 시 `operations/band/YYYY-MM-DD.md` 파일로 작성하여 저장소에 기록합니다.

> **보안 및 PII 준수 수칙**:
> - 댓글 원문, 작성자명, 참석자 실명, 계정명, 이메일, 전화번호, 계좌번호 등 PII(개인식별정보)를 절대 적지 않습니다.
> - 캡처 이미지에 멤버 이름이나 프로필 사진이 포함된 경우 저장소에 올리지 않습니다.
> - 변경 전 필드는 캡처가 아닌 본 양식의 구조화 필드로 기록합니다.

---

```md
# BAND 운영 로그 — YYYY-MM-DD

## 실행 컨텍스트
- 실행 시각(KST):
- 실행 역할: leader | co_leader | member | unknown
- 작업: inspect | post | monthly_index | event_create | event_edit | rollback
- 대상 BAND: band/56995933
- 실행 직전 확인: yes | no

## 기준선
- 멤버 수:
- 관측 시각:
- 최근 글 표본 수: 20
- 여행지/후기:
- 일정:
- 판매:
- 운영공지:
- 표본 댓글 합계:
- 표본 반응 합계:

## 대상
- 공개 ID/URL:
- 제목:
- 시작일:
- 종료일:
- 하루 종일: yes | no | unknown
- 댓글 수:
- 참석 응답 수:
- 게시글 공유: yes | no | unknown
- 날짜 원출처 일치: yes | no | date_conflict

## Event remediation

### 감사 범위
- 감사 시작 월:
- 감사 종료 월:
- 월별 화면 표시 합계:
- 고유 이벤트 ID 수:
- single_day:
- multi_day_future_zero:
- multi_day_future_engaged:
- active:
- past:
- date_conflict:
- duplicate_suspected:
- permission_blocked:
- eligible_total:
- held_total:

### 파일럿/배치
- 실행 단계: read_audit | pilot | zero_batch | engaged_single | feed_cleanup
- 파일럿 선택 근거: farthest_future | tie_longer_duration | none_eligible
- 배치 번호:
- 배치 크기:
- 일정 공개 ID/URL:
- 연결 공유글 ID/URL:
- 일정·공유글 결합 관계: independent | coupled | unknown

### 변경 전
- 제목:
- 시작일:
- 종료일:
- 하루 종일: yes | no | unknown
- 본문 전체 여행기간 문구: present | missing | unknown
- 댓글 수:
- 참석 응답 수:
- 게시글 공유: yes | no | unknown
- 알림 경고: none | shown | unknown

### 목표 변경
- 종료일=시작일: yes | no
- 제목 박수 보완: yes | no | not_needed
- 본문 전체 여행기간 추가: yes | no | not_needed
- 게시글 공유 끄기: yes | no | unavailable

### 보존·회귀 검증
- 달력 출발일 하루 표시: yes | no | unknown
- 일정 URL/ID 유지: yes | no | unknown
- 댓글 수 유지: yes | no | unknown
- 참석 응답 수 유지: yes | no | unknown
- 기존 공유글 URL/ID 유지: yes | no | unknown
- 신규 공유글 생성: yes | no | unknown
- 피드 재상단 노출: yes | no | unknown
- 예상 밖 알림: yes | no | unknown

### 롤백
- 롤백 필요: yes | no
- 롤백 시도: not_needed | restored_once | failed
- 원래 종료일 복원: yes | no | unknown
- URL/댓글/참석/공유글 복원 검증: pass | fail | unknown
- 비가역 영향: none | notification_sent | post_deleted | search_cache | unknown
- 중단 사유:

## 실행
- 의도:
- 변경 필드:
- 알림/재공유 경고: none | shown | unknown
- 결과: success | stopped | permission_denied | rollback | rollback_failed

## 검증
- URL 유지: yes | no | unknown
- 댓글/응답 보존: yes | no | unknown
- 달력 표시:
- 새 피드 공유 없음: yes | no | unknown
- 이상:

## 다음 행동
- A 점진 변환 | B 신규부터 적용 | C 공유글만 검토 | 중단 | 사람 확인 필요
- 근거:
```
