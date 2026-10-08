# ⚙️ CAFE CORE - 행동 로그 데이터 시뮬레이터 가이드

스마트 카페(CAFE CORE)의 PWA 및 키오스크 사용자 행동 로그, 장바구니 포기, 주문, 회원 프로필, 검색 로그를 현실적인 통계 분포를 기반으로 생성하는 파이썬 시뮬레이터 모듈입니다.

---

## 📋 시뮬레이터 파라미터 및 생성 조건

- **고객 모수**: 총 600명
  - 등록 회원: 400명 (`usr-0001` ~ `usr-0400`)
  - 비회원 식별자: 200명 (`guest-0001` ~ `guest-0200`)
- **총 세션 수**: 5,000건
  - PWA 채널: 약 2,900건 (58%)
  - 키오스크 채널: 약 2,100건 (42%)
- **구매 전환 및 이탈**:
  - 정상 주문 완료: 4,500건 (전환율 90.0%)
  - 장바구니 포기: 500건 (이탈률 10.0%)
    - 포기 원인: `PRICE_HIGH` (220건, 44%), `WAIT_TIME_LONG` (140건, 28%), `TIMEOUT_60S` (140건, 28%)
    - 이탈 단계: `OPTION_MODAL` (180건), `CART_SHEET` (210건), `PAY_POPUP` (110건)
- **주문 소요 시간**:
  - PWA 평균: 약 72초 (탐색형 사용자 위주)
  - Kiosk 평균: 약 58초 (단순 주문 및 대기열 압박)
- **출력 포맷**: NDJSON (NoSQL/Elasticsearch/BigQuery 적재용) 및 CSV (Pandas/R 분석용) 동시 생성

---

## 💻 실행 방법

```bash
# 기본 실행 (seed=42 고정, 재현성 보장)
python simulator/generate_dataset.py
```

생성 결과 파일은 프로젝트 루트의 `data/` 폴더에 자동 저장됩니다:
- `data/user_sessions.ndjson` & `.csv`
- `data/orders.ndjson` & `.csv`
- `data/users.ndjson` & `.csv`
- `data/search_logs.ndjson` & `.csv`
