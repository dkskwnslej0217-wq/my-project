# run_v10 → run_core / run_weekly 로 분리됨
- 매번 실행: run_core.md 사용
- 월요일 실행: run_weekly.md 사용
- 이 파일은 참고용으로 보관

---

# run_v10 (구버전)

## 입력
- 주제: [여기 입력] (비워두면 direction.md 보고 판단)
- 플랫폼: [YouTube / Instagram / Threads / 자동판단]
- 연속실행: [ON / OFF] (기본값 ON)

## 실행 순서

0-0. [월요일 첫 실행 시만]
     → brain/AI모니터.md 실행: 현재 서비스 점검, 더 나은 무료 대안 교체 제안
     → brain/트렌드예보.md 실행 → memory/트렌드예보.md 저장

0. skills/memory_db.md 읽기
   → DB에서 최근 5개 기록 불러오기
   → 이전 작업 맥락 파악 후 이후 실행에 반영

0-1. skills/멀티소스.md → 3개 소스 동시 수집 → brain/트렌드.md 저장

0-1-1. memory/캘린더.md 확인
        → 오늘 주제 있으면 바로 사용
        → 없으면 brain/캘린더.md 실행 후 생성

0-2. memory/예측.md 읽기 (예측 결과 있으면 참고)

0-3. brain/판단.md → 주제 확정 (중복 체크 + 예측 점수 반영)

0-4. skills/경쟁자분석.md → 차별화 포인트 추출

1. memory/direction.md 읽기
1-1. brain/개인화.md 읽기 → 성공 패턴 확인 → 콘텐츠에 반영
2. memory/context.md 읽기 (최근 3개만)
3. 플랫폼 판단 + skills/토큰최적화.md 규칙 적용
4. brain/알고리즘.md 읽기
5. 해당 플랫폼 skills 파일만 로드 (1개)
6. brain/패턴.md 읽기
7. brain/심리.md 읽기
8. 스크립트 생성
   → brain/바이럴공식.md 읽고 공식 1개 선택 후 적용
   → 훅 A버전, B버전 생성 → brain/AB테스트.md 기준으로 선택 → 선택 이유 기록
8-1. brain/감정분석.md로 감정 흐름 체크
     → 호기심→공감→희망 흐름 벗어나면 자동 수정
9. skills/자기검증.md 체크리스트 실행
   → 실패 항목 자동 수정 후 재출력
10. skills/vrew.md 읽기 → Vrew 설정값 생성
11. output/ 저장 (스크립트 + Vrew 설정값 함께)
12. memory/context.md 업데이트
13. memory/direction.md 업데이트
14. 자기점수 매기기 (트렌드 반영도 / 훅 강도 / 댓글 유도력)
14-1. score_total 5점 이하면 brain/실패감지.md 실행
      → 원인 분류 → brain/패턴.md 자동 수정
15. skills/memory_db.md → 결과 + 자기점수 DB에 저장
16. 완료 보고 (3줄)
17. [연속실행 ON이면] 다음 주제 제안 + 즉시 실행 여부 질문
18. 5회째 실행이면 brain/자기학습.md 실행 → brain/패턴.md 자동 업데이트
19. 10회째 실행이면 brain/댓글분석.md 실행 → memory/댓글반응.md 저장

## 출력 파일 구조

```
# [주제]

## 📄 스크립트
[내용]

## 🎬 Vrew 설정값
[배경/목소리/자막/형식]

## 📋 업로드 체크리스트
- [ ] Vrew에서 스크립트 붙여넣기
- [ ] 설정값 적용
- [ ] 영상 생성 (약 2분)
- [ ] 썸네일 제목 확인
- [ ] 업로드
```

## 하지 말 것
- Vrew 설정값 없이 스크립트만 출력 X
- 연속실행 ON인데 다음 주제 제안 안 하기 X
