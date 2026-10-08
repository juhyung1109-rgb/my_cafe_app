# 📊 CAFE CORE - 데이터 분석 주피터 노트북 가이드

본 디렉터리는 스마트 오더 & 키오스크 통합 카페 앱의 합성 행동 로그(5,000 세션)를 분석하는 Jupyter Notebook 및 환경 설정 파일을 포함합니다.

---

## 📁 주요 파일 구성

- **`cafe_analytics_analysis.ipynb`**: 10개 챕터로 구성된 종합 EDA, 가설 검정(t-test), 이탈 예측 머신러닝(Logistic Regression / Random Forest) 주피터 노트북
- **`requirements.txt`**: 필수 파이썬 라이브러리 목록 (`pandas`, `numpy`, `matplotlib`, `seaborn`, `scipy`, `scikit-learn`, `jupyter`)

---

## 🚀 빠른 시작 가이드 (Quick Start)

### 1. 가상환경 생성 및 의존성 패키지 설치
```bash
# 가상환경 활성화 (또는 conda)
pip install -r requirements.txt
```

### 2. 합성 데이터셋 확인 및 생성
데이터는 `beta/data/` 디렉터리에 사전 생성되어 있습니다.
새로 생성하거나 조건을 변경하려면 아래 명령을 실행합니다:
```bash
# 프로젝트 루트 디렉터리에서 실행
python beta/simulator/generate_dataset.py
```

생성되는 4대 코어 데이터셋:
1. `beta/data/user_sessions.ndjson` / `user_sessions.csv` (5,000건)
2. `beta/data/orders.ndjson` / `orders.csv` (4,500건)
3. `beta/data/users.ndjson` / `users.csv` (600명: 회원 400 + 비회원 200)
4. `beta/data/search_logs.ndjson` / `search_logs.csv` (~2,200건)

### 3. 주피터 노트북 실행
```bash
# 주피터 노트북 실행
jupyter notebook beta/notebooks/cafe_analytics_analysis.ipynb

# 또는 VS Code에서 beta/notebooks/cafe_analytics_analysis.ipynb를 열고 원하는 Python 커널 선택 후 [Run All]
```

---

## 📈 노트북 분석 챕터 구성 요약

1. **Chapter 01: Setup & Data Ingestion** - 라이브러리 로드, 한글 폰트 설정, 4대 데이터셋 판다스 DF 로드
2. **Chapter 02: Data Quality & Preprocessing** - 결측치 진단, 타입 캐스팅, 무결성 검증
3. **Chapter 03: EDA (Exploratory Data Analysis)** - 플랫폼 4대 핵심 KPI(전환율 90%, AOV, 평균 소요시간 등) 시각화
4. **Chapter 04: Cart Abandonment Deep Dive** - 장바구니 포기 500건의 단계(Option, Cart, Pay) 및 원인(가격, 대기시간, 타임아웃) 분석
5. **Chapter 05: Order Lead Time & Channel Comparison** - PWA vs Kiosk 소요시간 분포 비교 및 독립표본 t-test 통계 검정
6. **Chapter 06: Category Exploration Flow & Search Intent** - 카테고리 탐색 순서 및 검색 로그 키워드/클릭 순위 분석
7. **Chapter 07: Customer Segmentation & Preset Preference** - 회원(400명) vs 비회원(200명), RFM 등급, 맞춤 옵션 프리셋 분석
8. **Chapter 08: Contextual Dining Analysis** - 매장 이용(DINE_IN) vs 포장(TO_GO) 취식 맥락별 행동 차이 규명
9. **Chapter 09: Machine Learning Cart Abandonment Prediction** - Scikit-learn 로지스틱 회귀 & 랜덤 포레스트 이탈 예측 모델링 및 Feature Importance
10. **Chapter 10: Business Insights & Strategic Recommendations** - 데이터 기반 4대 개선 전략(UX 단축, 원클릭 결제, 프리셋 추천, 키오스크 타임아웃 개선)
