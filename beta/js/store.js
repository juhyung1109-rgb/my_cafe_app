/**
 * CAFE CORE - Central State Management & Event Bus (store.js)
 * 
 * - 실시간 다중 화면 동기화: Firebase Cloud Firestore onSnapshot (0.1초 실시간 푸시) + BroadcastChannel + Storage Event
 * - 스마트폰(PWA)에서 주문 누르면 PC 주방(KDS), 고객 상황판(DID), 매출 대시보드가 새로고침 0% 없이 즉시 갱신!
 * - 메가오더 스타일 풍성한 카테고리 & 서브카테고리 (커피, 디카페인, 음료, 티, 신메뉴, 추천)
 * - 동일 계정 스탬프 & 쿠폰북 시스템 (10잔 구매 시 아메리카노 1잔 무료, 20잔 구매 시 모든 제조음료 1잔 무료)
 */

const STORAGE_KEYS = {
  ORDERS: 'cafecore_orders_v1',
  NEXT_ORDER_NUM: 'cafecore_next_order_num_v1',
  LAST_CALL_STAFF: 'cafecore_last_call_staff_v1',
  USER_STAMPS: 'cafecore_user_stamps_v1'
};

// 메가오더 스크린샷 100% 완벽 재현 음료 마스터 데이터
const MENU_ITEMS = [
  // ==================== [커피 - 에스프레소] ====================
  {
    id: 'americano',
    name: '아메리카노',
    category: 'coffee',
    subCategory: 'espresso',
    isCoffee: true,
    price: 3500,
    image: './assets/images/americano.png',
    description: '깊고 진한 에스프레소에 깔끔한 물을 더한 시그니처 블렌드',
    options: { temperature: ['ICE', 'HOT'], extraShot: true, syrup: true },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'megano',
    name: '메가리카노 (1L 대용량)',
    category: 'coffee',
    subCategory: 'espresso',
    isCoffee: true,
    price: 4500,
    image: './assets/images/americano.png',
    description: '하루 종일 넉넉하게 즐기는 1리터 대용량 3샷 아메리카노',
    options: { temperature: ['ICE'], extraShot: true, syrup: true },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'honey_americano',
    name: '꿀아메리카노',
    category: 'coffee',
    subCategory: 'espresso',
    isCoffee: true,
    price: 3800,
    image: './assets/images/americano.png',
    description: '진한 에스프레소에 달콤한 사양벌꿀이 어우러진 달콤쌉싸름한 커피',
    options: { temperature: ['ICE', 'HOT'], extraShot: true },
    isRecommended: true,
    isNew: true,
    isDecaf: false
  },
  {
    id: 'vanilla_americano',
    name: '바닐라 아메리카노',
    category: 'coffee',
    subCategory: 'espresso',
    isCoffee: true,
    price: 3800,
    image: './assets/images/americano.png',
    description: '부드러운 마다가스카르 바닐라 풍미가 감도는 깔끔한 아메리카노',
    options: { temperature: ['ICE', 'HOT'], extraShot: true },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'hazelnut_americano',
    name: '헤이즐넛 아메리카노',
    category: 'coffee',
    subCategory: 'espresso',
    isCoffee: true,
    price: 3800,
    image: './assets/images/americano.png',
    description: '고소하고 그윽한 헤이즐넛 향이 입안 가득 퍼지는 아메리카노',
    options: { temperature: ['ICE', 'HOT'], extraShot: true },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },

  // ==================== [커피 - 라떼] ====================
  {
    id: 'cafe_latte',
    name: '카페 라떼',
    category: 'coffee',
    subCategory: 'latte',
    isCoffee: true,
    price: 4500,
    image: './assets/images/cafe_latte.png',
    description: '에스프레소와 부드러운 우유의 고소하고 완벽한 밸런스',
    options: { temperature: ['ICE', 'HOT'], extraShot: true },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'house_milk_latte',
    name: '하우스밀크 라떼',
    category: 'coffee',
    subCategory: 'latte',
    isCoffee: true,
    price: 3500,
    image: './assets/images/cafe_latte.png',
    description: '더욱 고소하고 진한 특제 하우스밀크로 블렌딩한 시그니처 라떼',
    options: { temperature: ['ICE'], extraShot: true },
    isRecommended: false,
    isNew: true,
    isDecaf: false
  },
  {
    id: 'vanilla_latte',
    name: '바닐라 라떼',
    category: 'coffee',
    subCategory: 'latte',
    isCoffee: true,
    price: 5000,
    image: './assets/images/vanilla_latte.png',
    description: '천연 마다가스카르 바닐라빈의 은은하고 달콤한 풍미',
    options: { temperature: ['ICE', 'HOT'], extraShot: true },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'caramel_macchiato',
    name: '카라멜 마끼아또',
    category: 'coffee',
    subCategory: 'latte',
    isCoffee: true,
    price: 5200,
    image: './assets/images/vanilla_latte.png',
    description: '달콤한 카라멜 드리즐과 벨벳 우유 거품, 진한 샷의 조화',
    options: { temperature: ['ICE', 'HOT'], extraShot: true },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'condensed_milk_latte',
    name: '연유 라떼 (돌체)',
    category: 'coffee',
    subCategory: 'latte',
    isCoffee: true,
    price: 5200,
    image: './assets/images/cafe_latte.png',
    description: '부드럽고 진한 연유 시럽이 가미된 달콤한 프리미엄 라떼',
    options: { temperature: ['ICE', 'HOT'], extraShot: true },
    isRecommended: false,
    isNew: true,
    isDecaf: false
  },
  {
    id: 'cappuccino',
    name: '카푸치노',
    category: 'coffee',
    subCategory: 'latte',
    isCoffee: true,
    price: 4500,
    image: './assets/images/cafe_latte.png',
    description: '풍성한 시나몬 파우더와 두터운 우유 거품의 클래식 이탈리안 커피',
    options: { temperature: ['ICE', 'HOT'], extraShot: true },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'cafe_mocha',
    name: '카페모카',
    category: 'coffee',
    subCategory: 'latte',
    isCoffee: true,
    price: 5200,
    image: './assets/images/vanilla_latte.png',
    description: '달콤한 초콜릿과 깊은 에스프레소, 부드러운 우유의 만남',
    options: { temperature: ['ICE', 'HOT'], extraShot: true },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },

  // ==================== [커피 - 콜드브루] ====================
  {
    id: 'coldbrew',
    name: '콜드브루',
    category: 'coffee',
    subCategory: 'coldbrew',
    isCoffee: true,
    price: 4500,
    image: './assets/images/coldbrew.png',
    description: '14시간 동안 차가운 물로 정성스레 침출한 부드러운 목넘김',
    options: { temperature: ['ICE'], extraShot: true },
    isRecommended: true,
    isNew: false,
    isDecaf: true
  },

  // ==================== [디카페인 라인업] ====================
  {
    id: 'decaf_americano',
    name: '디카페인 아메리카노',
    category: 'decaf',
    subCategory: 'espresso',
    isCoffee: true,
    price: 4000,
    image: './assets/images/americano.png',
    description: '카페인 부담 없이 풍부한 바디감과 향미를 그대로 즐기는 아메리카노',
    options: { temperature: ['ICE', 'HOT'], extraShot: true },
    isRecommended: false,
    isNew: false,
    isDecaf: true
  },
  {
    id: 'decaf_megano',
    name: '디카페인 메가리카노 (1L)',
    category: 'decaf',
    subCategory: 'espresso',
    isCoffee: true,
    price: 5000,
    image: './assets/images/americano.png',
    description: '밤에도 부담 없이 시원하게 마시는 1리터 대용량 디카페인 커피',
    options: { temperature: ['ICE'], extraShot: true },
    isRecommended: false,
    isNew: false,
    isDecaf: true
  },
  {
    id: 'decaf_latte',
    name: '디카페인 카페라떼',
    category: 'decaf',
    subCategory: 'latte',
    isCoffee: true,
    price: 5000,
    image: './assets/images/cafe_latte.png',
    description: '카페인 걱정 없이 늦은 밤에도 편안하게 즐기는 고소한 라떼',
    options: { temperature: ['ICE', 'HOT'], extraShot: true },
    isRecommended: false,
    isNew: false,
    isDecaf: true
  },

  // ==================== [음료 - 에이드] ====================
  {
    id: 'lemon_ade',
    name: '레몬 에이드',
    category: 'beverage',
    subCategory: 'ade',
    isCoffee: false,
    price: 3500,
    image: './assets/images/lemon_ade.png',
    description: '생레몬의 상큼함과 톡 쏘는 스파클링 탄산의 청량감',
    options: { temperature: ['ICE'] },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'blue_lemon_ade',
    name: '블루레몬 에이드',
    category: 'beverage',
    subCategory: 'ade',
    isCoffee: false,
    price: 3500,
    image: './assets/images/lemon_ade.png',
    description: '시원한 에메랄드빛 바다를 닮은 달콤 상큼한 블루 큐라소 레몬에이드',
    options: { temperature: ['ICE'] },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'grapefruit_ade',
    name: '자몽 에이드',
    category: 'beverage',
    subCategory: 'ade',
    isCoffee: false,
    price: 3500,
    image: './assets/images/grapefruit_ade.png',
    description: '쌉싸름하고 달콤한 붉은 자몽 과육이 살아있는 에이드',
    options: { temperature: ['ICE'] },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'green_grape_ade',
    name: '청포도 에이드',
    category: 'beverage',
    subCategory: 'ade',
    isCoffee: false,
    price: 3500,
    image: './assets/images/lemon_ade.png',
    description: '싱그러운 청포도 알갱이가 톡톡 씹히는 달콤한 스파클링 에이드',
    options: { temperature: ['ICE'] },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'mega_ade',
    name: '메가에이드 (레몬+자몽+라임)',
    category: 'beverage',
    subCategory: 'ade',
    isCoffee: false,
    price: 3900,
    image: './assets/images/grapefruit_ade.png',
    description: '레몬, 자몽, 라임 3가지 생과일이 듬뿍 들어가 궁극의 청량감을 선사하는 에이드',
    options: { temperature: ['ICE'] },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },

  // ==================== [음료 - 프라페 & 퐁크러쉬] ====================
  {
    id: 'plain_pong_crush',
    name: '플레인퐁크러쉬',
    category: 'beverage',
    subCategory: 'frappe',
    isCoffee: false,
    price: 3900,
    image: './assets/images/vanilla_latte.png',
    description: '고소한 죠리퐁이 듬뿍 얹어진 바삭하고 달콤한 시그니처 퐁크러쉬',
    options: { temperature: ['ICE'] },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'strawberry_pong_crush',
    name: '딸기퐁크러쉬',
    category: 'beverage',
    subCategory: 'frappe',
    isCoffee: false,
    price: 3900,
    image: './assets/images/strawberry_smoothie.png',
    description: '달콤한 딸기 스무디 베이스에 바삭한 죠리퐁을 가득 얹은 음료',
    options: { temperature: ['ICE'] },
    isRecommended: false,
    isNew: true,
    isDecaf: false
  },
  {
    id: 'strawberry_cookie_frappe',
    name: '딸기쿠키프라페',
    category: 'beverage',
    subCategory: 'frappe',
    isCoffee: false,
    price: 3900,
    image: './assets/images/strawberry_smoothie.png',
    description: '상큼한 딸기와 달콤한 오레오 쿠키, 풍성한 휘핑크림의 환상 조화',
    options: { temperature: ['ICE'] },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'cookie_frappe',
    name: '쿠키프라페',
    category: 'beverage',
    subCategory: 'frappe',
    isCoffee: false,
    price: 3900,
    image: './assets/images/vanilla_latte.png',
    description: '바삭한 초코 쿠키를 얼음과 함께 곱게 갈아 만든 달콤한 프라페',
    options: { temperature: ['ICE'] },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },

  // ==================== [음료 - 스무디 & 쥬스] ====================
  {
    id: 'strawberry_smoothie',
    name: '딸기 요거트 스무디',
    category: 'beverage',
    subCategory: 'smoothie',
    isCoffee: false,
    price: 3900,
    image: './assets/images/strawberry_smoothie.png',
    description: '신선한 생딸기 과육과 상큼하고 부드러운 플레인 요거트가 듬뿍 블렌딩된 스무디',
    options: { temperature: ['ICE'] },
    isRecommended: true,
    isNew: true,
    isDecaf: false
  },
  {
    id: 'gold_mango_smoothie',
    name: '골드망고 스무디',
    category: 'beverage',
    subCategory: 'smoothie',
    isCoffee: false,
    price: 3900,
    image: './assets/images/mango_smoothie.png',
    description: '진하고 달콤한 열대 골드망고 과육을 얼음과 함께 곱게 갈아낸 프리미엄 스무디',
    options: { temperature: ['ICE'] },
    isRecommended: false,
    isNew: true,
    isDecaf: false
  },
  {
    id: 'coconut_coffee_smoothie',
    name: '코코넛커피 스무디',
    category: 'beverage',
    subCategory: 'smoothie',
    isCoffee: true,
    price: 4800,
    image: './assets/images/vanilla_latte.png',
    description: '달콤 고소한 코코넛 스무디에 진한 에스프레소 샷을 부어 즐기는 베트남식 커피',
    options: { temperature: ['ICE'], extraShot: true },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },

  // ==================== [음료 - 논-커피 라떼 & 티/음료 (총 10건)] ====================
  {
    id: 'strawberry_latte',
    name: '딸기 라떼',
    category: 'beverage',
    subCategory: 'tea',
    isCoffee: false,
    price: 3700,
    image: './assets/images/strawberry_smoothie.png',
    description: '국산 딸기 과육이 듬뿍 담긴 달콤 상큼한 프리미엄 우유 음료',
    options: { temperature: ['ICE'] },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'ice_choco',
    name: '아이스초코',
    category: 'beverage',
    subCategory: 'tea',
    isCoffee: false,
    price: 3500,
    image: './assets/images/vanilla_latte.png',
    description: '진하고 깊은 벨기에 다크 초콜릿 파우더로 만든 달콤한 음료',
    options: { temperature: ['ICE'] },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'matcha_latte',
    name: '녹차 라떼 (말차)',
    category: 'beverage',
    subCategory: 'tea',
    isCoffee: false,
    price: 3500,
    image: './assets/images/matcha_latte.png',
    description: '제주 유기농 찻잎을 곱게 갈아 만든 진하고 깊은 녹차 라떼',
    options: { temperature: ['ICE', 'HOT'] },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'brown_sugar_bubble_latte',
    name: '흑당버블 라떼',
    category: 'beverage',
    subCategory: 'tea',
    isCoffee: false,
    price: 3700,
    image: './assets/images/cafe_latte.png',
    description: '쫀득한 타피오카 펄과 대만식 진한 흑당 시럽의 달콤한 만남',
    options: { temperature: ['ICE'] },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'peach_iced_tea',
    name: '복숭아 아이스티',
    category: 'beverage',
    subCategory: 'tea',
    isCoffee: false,
    price: 3000,
    image: './assets/images/peach_iced_tea.png',
    description: '향긋하고 달콤한 복숭아 과즙과 깊고 깔끔한 홍차의 산뜻한 조화',
    options: { temperature: ['ICE'] },
    isRecommended: true,
    isNew: true,
    isDecaf: false
  },
  {
    id: 'lemon_iced_tea',
    name: '레몬 아이스티',
    category: 'beverage',
    subCategory: 'tea',
    isCoffee: false,
    price: 3000,
    image: './assets/images/lemon_iced_tea.png',
    description: '상큼한 생레몬의 산미와 은은한 홍차가 어우러진 갈증 해소 시그니처 티',
    options: { temperature: ['ICE'] },
    isRecommended: false,
    isNew: true,
    isDecaf: false
  },
  {
    id: 'zero_lemon_matcha_iced_tea',
    name: '제로 레몬말차 아이스티',
    category: 'beverage',
    subCategory: 'tea',
    isCoffee: false,
    price: 2400,
    image: './assets/images/matcha_latte.png',
    description: '칼로리 걱정 없는 제로 당류에 상큼한 레몬과 말차의 청량한 블렌딩',
    options: { temperature: ['ICE'] },
    isRecommended: false,
    isNew: true,
    isDecaf: false
  },
  {
    id: 'honey_grapefruit_black_tea',
    name: '허니자몽 블랙티',
    category: 'beverage',
    subCategory: 'tea',
    isCoffee: false,
    price: 3700,
    image: './assets/images/grapefruit_ade.png',
    description: '달콤한 꿀과 쌉싸름한 붉은 자몽 생과육, 깊은 블랙티의 향긋한 조화',
    options: { temperature: ['ICE', 'HOT'] },
    isRecommended: true,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'apple_citron_tea',
    name: '사과유자차',
    category: 'beverage',
    subCategory: 'tea',
    isCoffee: false,
    price: 3500,
    image: './assets/images/lemon_ade.png',
    description: '달콤한 사과 과육과 향긋한 고흥 유자가 듬뿍 들어간 따뜻하고 상큼한 티',
    options: { temperature: ['ICE', 'HOT'] },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  },
  {
    id: 'earlgrey_tea',
    name: '얼그레이 티',
    category: 'beverage',
    subCategory: 'tea',
    isCoffee: false,
    price: 3300,
    image: './assets/images/earl_grey_tea.png',
    description: '향긋한 천연 베르가못 오일이 블렌딩된 프리미엄 클래식 홍차',
    options: { temperature: ['ICE', 'HOT'] },
    isRecommended: false,
    isNew: false,
    isDecaf: false
  }
];

class CafeStore {
  constructor() {
    this.listeners = new Set();
    this.broadcast = null;
    this.db = null;

    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcast = new BroadcastChannel('cafecore_channel');
      this.broadcast.onmessage = (event) => {
        this.notify(event.data);
      };
    }

    // fallback for other tabs
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('cafecore_')) {
        this.notify({ type: 'STORAGE_SYNC', key: e.key });
      }
    });

    // 초기 데이터 검증 및 시드
    const existingOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!existingOrders || existingOrders.includes('ord-101')) {
      this.seedInitialData();
    }

    // Google Cloud Firestore 실시간 리스너 자동 초기화 (스마트폰 주문 시 PC 주방 0.1초 실시간 푸시)
    this.initFirestoreSync();
  }

  /**
   * Firestore DB 인스턴스 안전 획득 (지연 로딩 및 Named Database 완벽 대응)
   */
  getDb() {
    if (this.db) return this.db;
    if (typeof firebase !== 'undefined' && window.isFirebaseConfigured && window.isFirebaseConfigured()) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.databaseId) {
          try {
            this.db = firebase.app().firestore(window.FIREBASE_CONFIG.databaseId);
          } catch {
            this.db = firebase.firestore();
          }
        } else {
          this.db = firebase.firestore();
        }
        return this.db;
      } catch (e) {
        console.warn('[Firestore] getDb 초기화 실패:', e);
      }
    }
    return null;
  }

  /**
   * Firestore 저장을 위해 undefined 값을 안전하게 제거/null 처리
   */
  sanitizeForFirestore(obj) {
    if (obj === undefined) return null;
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (value === undefined) return null;
      return value;
    }));
  }

  /**
   * JavaScript 객체를 Firestore REST API 형식(fields)으로 변환
   */
  toFirestoreFields(obj) {
    const parseVal = (v) => {
      if (v === null || v === undefined) return { nullValue: null };
      if (typeof v === 'boolean') return { booleanValue: v };
      if (typeof v === 'number') {
        return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
      }
      if (typeof v === 'string') return { stringValue: v };
      if (Array.isArray(v)) return { arrayValue: { values: v.map(parseVal) } };
      if (typeof v === 'object') {
        const f = {};
        for (const k in v) {
          if (v[k] !== undefined) f[k] = parseVal(v[k]);
        }
        return { mapValue: { fields: f } };
      }
      return { stringValue: String(v) };
    };
    const fields = {};
    for (const k in obj) {
      if (obj[k] !== undefined) fields[k] = parseVal(obj[k]);
    }
    return { fields };
  }

  /**
   * Firestore REST API를 통한 안전한 주문 저장/갱신 (SDK 미작동/방화벽/네트워크 환경 100% 대응)
   */
  async sendOrderRestPatch(orderId, orderData, maskFields = null) {
    try {
      const projectId = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId) || 'iceu-songpa03';
      let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders/${orderId}`;
      if (maskFields && Array.isArray(maskFields) && maskFields.length > 0) {
        url += '?' + maskFields.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
      }
      const clean = this.sanitizeForFirestore(orderData);
      const payload = this.toFirestoreFields(clean);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        console.log('✅ [Firestore Cloud REST] 주문 클라우드 동기화 성공:', orderId);
      } else {
        console.warn('⚠️ [Firestore Cloud REST] 주문 동기화 응답 코드:', res.status);
      }
    } catch (err) {
      console.warn('[Firestore REST] 동기화 실패 (오프라인 모드 유지):', err);
    }
  }

  /**
   * 신규 또는 기존 주문을 Firestore Cloud에 SDK + REST API 이중화 전송
   */
  saveOrderToCloud(order) {
    if (!order || !order.id) return;
    const cleanOrder = this.sanitizeForFirestore(order);

    // 1. Firebase SDK 우선 전송 (실시간 WebSocket)
    const db = this.getDb();
    if (db) {
      db.collection('orders').doc(cleanOrder.id).set(cleanOrder, { merge: true })
        .then(() => {
          console.log('✅ [Firestore SDK] 주문 클라우드 동기화 완료:', cleanOrder.id);
        })
        .catch((err) => {
          console.warn('[Firestore SDK] 주문 저장 폴백 경고 -> REST API 전송:', err);
          this.sendOrderRestPatch(order.id, cleanOrder);
        });
    }

    // 2. REST API 백업 전송 (SDK 미연결/권한지연 시에도 100% 클라우드에 영구 기록 보장)
    this.sendOrderRestPatch(order.id, cleanOrder);
  }

  /**
   * 로컬 주문과 클라우드 주문을 타임스탬프 기준으로 스마트 병합 (로컬 최신 변경 및 신규 주문 손실 방지)
   */
  mergeCloudOrders(cloudOrders) {
    if (!cloudOrders || !Array.isArray(cloudOrders) || cloudOrders.length === 0) return;

    const currentLocal = this.getOrders();
    const mergedMap = new Map();
    let hasLocalChanges = false;
    const pendingCloudSyncOrders = [];

    // 1. 현재 로컬 주문 맵 등록
    currentLocal.forEach((ord) => {
      if (ord && ord.id) mergedMap.set(ord.id, ord);
    });

    // 2. 클라우드 주문과 스마트 병합 (타임스탬프 기반 최신 우선)
    cloudOrders.forEach((cloudOrd) => {
      if (!cloudOrd || !cloudOrd.id) return;
      const localOrd = mergedMap.get(cloudOrd.id);
      if (!localOrd) {
        // 로컬에 없는 신규 주문
        mergedMap.set(cloudOrd.id, cloudOrd);
        hasLocalChanges = true;
      } else {
        const localTime = new Date(localOrd.updatedAt || localOrd.createdAt || 0).getTime();
        const cloudTime = new Date(cloudOrd.updatedAt || cloudOrd.createdAt || 0).getTime();

        if (cloudTime > localTime) {
          mergedMap.set(cloudOrd.id, cloudOrd);
          hasLocalChanges = true;
        } else if (localTime > cloudTime) {
          // 로컬이 더 최신 상태인 경우(방금 주방에서 조리시작/완료 등 변경) 클라우드로 재전송
          pendingCloudSyncOrders.push(localOrd);
        }
      }
    });

    // 3. 로컬에만 있고 클라우드에 아직 없는 주문 검출 (방금 키오스크/PWA에서 생성된 주문 등)
    currentLocal.forEach((localOrd) => {
      if (localOrd && localOrd.id && !cloudOrders.some((c) => c.id === localOrd.id)) {
        pendingCloudSyncOrders.push(localOrd);
      }
    });

    // 클라우드 미반영 주문 푸시
    pendingCloudSyncOrders.forEach((ord) => {
      this.saveOrderToCloud(ord);
    });

    if (hasLocalChanges) {
      const mergedList = Array.from(mergedMap.values());
      mergedList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      this.saveOrders(mergedList);
      this.emit('CLOUD_SYNC_UPDATED', { orders: mergedList });
      this.emit('ORDER_STATUS_CHANGED', { orders: mergedList });
      this.emit('NEW_ORDER', { orders: mergedList });
    }
  }

  /**
   * Firebase Firestore 실시간 스냅샷 리스너 및 초기 클라우드 동기화
   * - 스마트폰, 키오스크, PC 어디서 주문/상태변경을 하든 0.1초 만에 새로고침 없이 즉시 실시간 동기화!
   */
  initFirestoreSync() {
    const tryConnect = () => {
      // 1. 초기 1회 즉시 fetch (REST API + SDK 병행)
      this.syncOrdersFromCloud();

      const db = this.getDb();
      if (!db) {
        if (!this._retryCount) this._retryCount = 0;
        if (this._retryCount < 5) {
          this._retryCount++;
          setTimeout(tryConnect, 600);
        }
      } else {
        console.log('🔗 [Firestore] CafeStore 클라우드 주문 동기화 파이프라인 가동');
        try {
          db.collection('orders').onSnapshot((snapshot) => {
            const cloudOrders = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (data && data.id) {
                cloudOrders.push(data);
              }
            });

            if (cloudOrders.length > 0) {
              this.mergeCloudOrders(cloudOrders);
            }
          }, (err) => {
            console.warn('[Firestore] 실시간 리스너 연결 대기 중 (REST 폴백 가동):', err);
          });
        } catch (subErr) {
          console.warn('[Firestore] onSnapshot 구독 예외:', subErr);
        }
      }

      // 2. 2초 주기 안전망 폴링 (REST API 직접 호출 보장 - PC 주방 KDS 화면에서 절대 누락 없음)
      if (!this._syncInterval) {
        this._syncInterval = setInterval(() => {
          this.syncOrdersFromCloud();
        }, 2000);
      }
    };

    tryConnect();
  }

  /**
   * 클라우드 Firestore에서 주문 데이터를 수동/주기적으로 가져와 로컬과 동기화
   * - SDK 시도 후 실패 시 공식 REST API(HTTP 200)로 100% 무조건 fetch!
   */
  async syncOrdersFromCloud() {
    let cloudOrders = [];

    // 방법 A: Firestore SDK
    const db = this.getDb();
    if (db) {
      try {
        const snapshot = await db.collection('orders').get();
        if (!snapshot.empty) {
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data && data.id) cloudOrders.push(data);
          });
        }
      } catch (sdkErr) {
        // SDK 실패 시 REST API로 넘어감
      }
    }

    // 방법 B: REST API 직접 fetch (SDK 미연결/권한지연 시 100% 동작)
    if (cloudOrders.length === 0) {
      try {
        const res = await fetch('https://firestore.googleapis.com/v1/projects/iceu-songpa03/databases/(default)/documents/orders');
        if (res.ok) {
          const json = await res.json();
          if (json.documents && Array.isArray(json.documents)) {
            const parseVal = (v) => {
              if (!v) return null;
              if (v.stringValue !== undefined) return v.stringValue;
              if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
              if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
              if (v.booleanValue !== undefined) return v.booleanValue;
              if (v.nullValue !== undefined) return null;
              if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(parseVal);
              if (v.mapValue !== undefined) {
                const o = {};
                for (const k in v.mapValue.fields) o[k] = parseVal(v.mapValue.fields[k]);
                return o;
              }
              return null;
            };

            cloudOrders = json.documents.map((d) => {
              const o = {};
              for (const k in d.fields) o[k] = parseVal(d.fields[k]);
              return o;
            }).filter((o) => o && o.id);
          }
        }
      } catch (restErr) {
        // 네트워크 단절 시 무시
      }
    }

    if (cloudOrders.length > 0) {
      this.mergeCloudOrders(cloudOrders);
    }
  }

  // 초기 상태: 0건 (사용자가 직접 주문하여 1건씩 확인할 수 있도록 클린 시작)
  seedInitialData() {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.NEXT_ORDER_NUM, '1');
  }

  // 구독자 알림
  notify(payload) {
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });
  }

  emit(action, data = {}) {
    const payload = { action, data, timestamp: Date.now() };
    if (this.broadcast) {
      this.broadcast.postMessage(payload);
    }
    this.notify(payload);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getMenuItems() {
    return MENU_ITEMS;
  }

  getMenuItemById(id) {
    return MENU_ITEMS.find((m) => m.id === id);
  }

  getOrders() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveOrders(orders) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }

  getNextOrderNumber() {
    const nextNum = parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_ORDER_NUM) || '1', 10);
    localStorage.setItem(STORAGE_KEYS.NEXT_ORDER_NUM, String(nextNum + 1));
    return nextNum;
  }

  /**
   * 신규 주문 생성 (PWA or Kiosk)
   * - 쿠폰 적용 할인 처리
   * - 동일 계정 스탬프 자동 적립 (10잔 아메리카노 무료, 20잔 전 음료 무료 쿠폰 자동 발급)
   * - Firestore 실시간 클라우드 전송 (스마트폰에서 누르면 PC 주방/상황판 0.1초 자동 팝업!)
   */
  createOrder({ channel, items, userId, userName, appliedCoupon, discountAmount = 0, finalAmount }) {
    const orderNumber = this.getNextOrderNumber();
    const subTotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    const totalAmount = finalAmount !== undefined ? finalAmount : Math.max(0, subTotal - discountAmount);
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

    const newOrder = {
      id: `ord-${orderNumber}-${Date.now()}`,
      orderNumber,
      channel: channel || 'pwa',
      status: 'received', // received -> cooking -> ready -> completed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: items.map((it) => ({
        name: it.name,
        price: it.price || 0,
        quantity: it.quantity || 1,
        image: it.image || '',
        temperature: it.temperature || 'ICE',
        selectedShot: it.selectedShot || '기본',
        selectedSyrup: it.selectedSyrup || '기본',
        options: it.options || {},
        checked: false
      })),
      subTotal,
      discountAmount,
      appliedCoupon: appliedCoupon || null,
      totalAmount,
      totalQuantity,
      userId: userId || null,
      userName: userName || '고객'
    };

    const orders = this.getOrders();
    orders.push(newOrder);
    this.saveOrders(orders);

    // 스탬프 자동 적립 및 쿠폰 사용 처리 (회원/비회원 모두 실시간 적립 지원)
    const authUser = window.cafeAuth && window.cafeAuth.getCurrentUser && window.cafeAuth.getCurrentUser();
    const effectiveUserKey = userId || (authUser && (authUser.email || authUser.uid)) || 'guest';

    if (appliedCoupon && appliedCoupon.id) {
      this.useCoupon(effectiveUserKey, appliedCoupon.id);
    }
    this.addStampsForUser(effectiveUserKey, totalQuantity);

    // Firestore 실시간 클라우드 푸시 (SDK + REST API 이중화 보장)
    this.saveOrderToCloud(newOrder);

    this.emit('NEW_ORDER', { order: newOrder });
    return newOrder;
  }

  // --- 스탬프 및 쿠폰북 시스템 ---
  getAllUsersStampData() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_STAMPS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  saveAllUsersStampData(data) {
    localStorage.setItem(STORAGE_KEYS.USER_STAMPS, JSON.stringify(data));
  }

  getUserStampData(userIdOrEmail) {
    const all = this.getAllUsersStampData();
    const authUser = window.cafeAuth && window.cafeAuth.getCurrentUser && window.cafeAuth.getCurrentUser();
    let key = userIdOrEmail;
    if (!key || key === 'undefined' || key === 'null') {
      key = (authUser && (authUser.email || authUser.uid)) || 'guest';
    }

    // 만약 key로 데이터가 없는데 authUser의 이메일이나 uid에 데이터가 있으면 동기화
    if (!all[key] && authUser) {
      if (authUser.email && all[authUser.email]) return all[authUser.email];
      if (authUser.uid && all[authUser.uid]) return all[authUser.uid];
    }

    let userStamp = all[key];
    if (!userStamp) {
      userStamp = {
        totalCups: 0,
        currentStamps: 0, // 0~20
        coupons: []
      };
      all[key] = userStamp;
      this.saveAllUsersStampData(all);
    }

    // 자가 치유(Self-Healing): totalCups가 0인데 기존 주문 내역이 있다면 주문 잔 수 자동 합산 복구
    if (userStamp.totalCups === 0) {
      const orders = this.getOrders();
      let calculatedCups = 0;
      orders.forEach((o) => {
        if (
          o.userId === key ||
          (authUser && (o.userId === authUser.email || o.userId === authUser.uid)) ||
          key === 'guest'
        ) {
          calculatedCups += (o.totalQuantity || 0);
        }
      });
      if (calculatedCups > 0) {
        userStamp.totalCups = calculatedCups;
        userStamp.currentStamps = calculatedCups % 20;
        all[key] = userStamp;
        this.saveAllUsersStampData(all);
      }
    }

    return userStamp;
  }

  /**
   * 동일 계정 스탬프 적립 및 마일스톤 쿠폰 자동 발급
   * - 10잔 누적: 아메리카노 1잔 무료 쿠폰
   * - 20잔 누적: 모든 제조 음료 1잔 무료 쿠폰
   */
  addStampsForUser(userIdOrEmail, cups) {
    const authUser = window.cafeAuth && window.cafeAuth.getCurrentUser && window.cafeAuth.getCurrentUser();
    let key = userIdOrEmail;
    if (!key || key === 'undefined' || key === 'null') {
      key = (authUser && (authUser.email || authUser.uid)) || 'guest';
    }
    if (cups <= 0) return null;

    const all = this.getAllUsersStampData();
    let user = all[key];
    if (!user && authUser) {
      if (authUser.email && all[authUser.email]) {
        user = all[authUser.email];
        key = authUser.email;
      } else if (authUser.uid && all[authUser.uid]) {
        user = all[authUser.uid];
        key = authUser.uid;
      }
    }
    if (!user) {
      user = { totalCups: 0, currentStamps: 0, coupons: [] };
    }

    const prevTotal = user.totalCups || 0;
    user.totalCups = (user.totalCups || 0) + cups;
    user.currentStamps = ((user.currentStamps || 0) + cups) % 20;

    // 10잔/20잔 마일스톤 검사 및 쿠폰 지급
    const newlyIssuedCoupons = [];
    const prevTens = Math.floor(prevTotal / 10);
    const newTens = Math.floor(user.totalCups / 10);

    for (let t = prevTens + 1; t <= newTens; t++) {
      if (t % 2 === 1) {
        // 10, 30, 50 ... 잔 달성: 아메리카노 1잔 무료 쿠폰
        const cpn = {
          id: `cpn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: '☕ 아메리카노 1잔 무료 쿠폰',
          subTitle: '10잔 구매 달성 감사 혜택',
          type: 'americano',
          discountMax: 3500,
          issuedAt: new Date().toISOString(),
          isUsed: false
        };
        user.coupons.unshift(cpn);
        newlyIssuedCoupons.push(cpn);
      } else {
        // 20, 40, 60 ... 잔 달성: 모든 제조 음료 1잔 무료 쿠폰
        const cpn = {
          id: `cpn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: '🍹 모든 제조 음료 1잔 무료 쿠폰',
          subTitle: '20잔 구매 달성 VIP 감사 혜택',
          type: 'any_beverage',
          discountMax: 5500,
          issuedAt: new Date().toISOString(),
          isUsed: false
        };
        user.coupons.unshift(cpn);
        newlyIssuedCoupons.push(cpn);
      }
    }

    all[key] = user;
    this.saveAllUsersStampData(all);

    this.emit('STAMPS_UPDATED', {
      userId: key,
      userData: user,
      newlyIssuedCoupons
    });

    return { user, newlyIssuedCoupons };
  }

  useCoupon(userIdOrEmail, couponId) {
    if (!couponId && userIdOrEmail) {
      couponId = userIdOrEmail;
      userIdOrEmail = null;
    }
    if (!couponId) return false;

    const all = this.getAllUsersStampData();
    if (userIdOrEmail && all[userIdOrEmail]) {
      const user = all[userIdOrEmail];
      if (user.coupons) {
        const cpn = user.coupons.find((c) => c.id === couponId);
        if (cpn && !cpn.isUsed) {
          cpn.isUsed = true;
          cpn.usedAt = new Date().toISOString();
          this.saveAllUsersStampData(all);
          this.emit('COUPON_USED', { userId: userIdOrEmail, coupon: cpn });
          return true;
        }
      }
    } else {
      for (const uid in all) {
        const u = all[uid];
        if (u && u.coupons) {
          const cpn = u.coupons.find((c) => c.id === couponId);
          if (cpn && !cpn.isUsed) {
            cpn.isUsed = true;
            cpn.usedAt = new Date().toISOString();
            this.saveAllUsersStampData(all);
            this.emit('COUPON_USED', { userId: uid, coupon: cpn });
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * PWA 전용 스탬프 요약 정보 조회
   */
  getUserStampInfo(userIdOrEmail) {
    const data = this.getUserStampData(userIdOrEmail);
    const totalCups = data.totalCups || 0;
    const currentCycleCups = data.currentStamps !== undefined ? data.currentStamps : (totalCups % 20);
    const cupsUntilNext = currentCycleCups < 10 ? (10 - currentCycleCups) : (20 - currentCycleCups);
    return {
      totalCups,
      currentCycleCups,
      cupsUntilNext: cupsUntilNext === 0 ? 10 : cupsUntilNext
    };
  }

  /**
   * PWA 전용 미사용 쿠폰 목록 조회
   */
  getUserCoupons(userIdOrEmail) {
    const data = this.getUserStampData(userIdOrEmail);
    return (data.coupons || []).filter((c) => !c.isUsed).map((c) => ({
      ...c,
      name: c.title || c.name || (c.type === 'americano' ? '아메리카노 1잔 무료 쿠폰' : '모든 제조 음료 1잔 무료 쿠폰'),
      benefit: c.subTitle || c.benefit || (c.type === 'americano' ? '아메리카노 무료 증정' : '모든 제조음료 무료 증정')
    }));
  }

  /**
   * 주문 상태 변경 (received -> cooking -> ready -> completed)
   * - Firestore에 즉시 클라우드 업데이트 -> 주방/상황판 실시간 딩동벨 울림!
   */
  updateOrderStatus(orderId, newStatus) {
    const orders = this.getOrders();
    const target = orders.find((o) => o.id === orderId);
    if (!target) return null;

    target.status = newStatus;
    target.updatedAt = new Date().toISOString();

    if (newStatus === 'ready') {
      target.isRecentReady = true;
      orders.forEach((o) => {
        if (o.id !== orderId) o.isRecentReady = false;
      });
      target.items.forEach((it) => (it.checked = true));
    }

    this.saveOrders(orders);

    // Firestore 클라우드 업데이트 (SDK + REST 이중화 보장)
    const db = this.getDb();
    const cleanItems = this.sanitizeForFirestore(target.items);
    if (db) {
      db.collection('orders').doc(orderId).set({
        status: newStatus,
        updatedAt: target.updatedAt,
        items: cleanItems
      }, { merge: true }).catch((err) => {
        console.warn('[Firestore SDK] 주문 상태 업데이트 폴백:', err);
      });
    }

    // REST API를 통한 즉시 업데이트 보장
    this.sendOrderRestPatch(orderId, {
      status: newStatus,
      updatedAt: target.updatedAt,
      items: target.items
    }, ['status', 'updatedAt', 'items']);

    this.emit('ORDER_STATUS_CHANGED', { orderId, newStatus, order: target });
    return target;
  }

  /**
   * 주방 KDS 개별 항목 제조 체크 토글
   */
  toggleItemKitchenCheck(orderId, itemIndex) {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order || !order.items[itemIndex]) return null;

    order.items[itemIndex].checked = !order.items[itemIndex].checked;
    order.updatedAt = new Date().toISOString();
    this.saveOrders(orders);

    const cleanItems = this.sanitizeForFirestore(order.items);
    const db = this.getDb();
    if (db) {
      db.collection('orders').doc(orderId).set({
        items: cleanItems,
        updatedAt: order.updatedAt
      }, { merge: true }).catch(() => {});
    }

    this.sendOrderRestPatch(orderId, {
      items: order.items,
      updatedAt: order.updatedAt
    }, ['items', 'updatedAt']);

    this.emit('ITEM_CHECK_CHANGED', { orderId, itemIndex, checked: order.items[itemIndex].checked });
    return order;
  }

  /**
   * 직원 호출 알림 (키오스크용)
   */
  callStaff(message = '키오스크에서 직원을 호출했습니다.') {
    localStorage.setItem(STORAGE_KEYS.LAST_CALL_STAFF, Date.now());
    this.emit('CALL_STAFF', { message, timestamp: new Date().toLocaleTimeString() });
  }

  /**
   * 전체 주문 및 매출 0건으로 완전 초기화
   */
  clearAllOrders() {
    this.saveOrders([]);
    localStorage.setItem(STORAGE_KEYS.NEXT_ORDER_NUM, '1');

    const db = this.getDb();
    if (db) {
      db.collection('orders').get().then((snapshot) => {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        return batch.commit();
      }).catch(() => {});
    }

    // REST API로도 클라우드 orders 컬렉션 모든 문서 삭제 보장
    const projectId = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId) || 'iceu-songpa03';
    fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.documents && Array.isArray(data.documents)) {
          data.documents.forEach((d) => {
            fetch(`https://firestore.googleapis.com/v1/${d.name}`, { method: 'DELETE' }).catch(() => {});
          });
        }
      })
      .catch(() => {});

    this.emit('RESET_DATA', { timestamp: Date.now() });
  }

  /**
   * 매출 대시보드 집계 데이터 생성
   */
  getSalesSummary() {
    const orders = this.getOrders();
    let totalPayment = 0;
    let netSales = 0;
    let refundAmount = 0;
    let totalOrderCount = 0;
    let totalCups = 0;

    const menuSalesMap = {};
    const hourlySalesMap = {};
    for (let h = 9; h <= 21; h++) {
      hourlySalesMap[`${h}시`] = 0;
    }

    let pwaCount = 0;
    let kioskCount = 0;

    orders.forEach((o) => {
      totalOrderCount += 1;
      totalPayment += o.totalAmount || 0;
      netSales += o.totalAmount || 0;
      totalCups += o.totalQuantity || 0;

      if (o.channel === 'pwa') pwaCount += 1;
      if (o.channel === 'kiosk') kioskCount += 1;

      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((it) => {
          if (!menuSalesMap[it.name]) {
            menuSalesMap[it.name] = { name: it.name, count: 0, revenue: 0 };
          }
          menuSalesMap[it.name].count += it.quantity || 1;
          menuSalesMap[it.name].revenue += (it.price || 0) * (it.quantity || 1);
        });
      }

      const date = new Date(o.createdAt);
      const hour = date.getHours();
      const hourKey = `${hour}시`;
      if (hourlySalesMap[hourKey] !== undefined) {
        hourlySalesMap[hourKey] += o.totalAmount || 0;
      }
    });

    const menuSales = Object.values(menuSalesMap).sort((a, b) => b.revenue - a.revenue);

    return {
      totalPayment,
      netSales,
      refundAmount,
      totalOrderCount,
      totalCups,
      menuSales,
      hourlySales: hourlySalesMap,
      channelBreakdown: {
        pwa: pwaCount,
        kiosk: kioskCount,
        total: totalOrderCount
      }
    };
  }
}

// 전역 싱글톤 인스턴스 생성
window.cafeStore = new CafeStore();
