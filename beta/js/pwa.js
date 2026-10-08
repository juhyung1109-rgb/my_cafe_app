/**
 * CAFE CORE - Smartphone PWA Mobile Logic (pwa.js) v2.5
 * - 메가오더 스타일 1차 언더라인 탭 & 2차 서브 알약 탭 (신메뉴, 추천메뉴, 커피, 디카페인, 음료, 전체)
 * - 가로형 카드 리스트 / 그리드 뷰 토글
 * - 40여종 마스터 메뉴 로딩 및 필터링
 * - 스탬프 & 쿠폰북 모달 (20구 스탬프 보드 + 10잔 아메리카노 / 20잔 전음료 무료 쿠폰 자동 발급)
 * - 장바구니 내 쿠폰 선택 할인 적용 및 실시간 결제
 * - Cloud Firestore 실시간 연동 (스마트폰 주문 즉시 PC 주방/상황판 0.1초 무새로고침 반영)
 * - 메가오더 전체메뉴(☰) 서랍 모달 & 내 주문 실시간 추적
 */

let deferredInstallPrompt = null;
let currentMainCategory = 'coffee'; // 기본 선택: 커피
let currentSubCategory = 'all';     // 소분류 필터

// 장바구니 상태
let cart = [];
let appliedCoupon = null; // 장바구니에 적용된 쿠폰 객체

// 옵션 모달 선택 상태
let pwaPendingItem = null;
let pwaSelectedTemp = 'ICE';
let pwaSelectedSize = 'Regular';
let pwaSelectedSizeAdd = 0;
let pwaSelectedShot = '기본';
let pwaSelectedShotAdd = 0;
let pwaSelectedSyrup = '기본';
let pwaSelectedSyrupAdd = 0;
let pwaSelectedIce = '보통';

// 내 최근 주문 ID 기록
const PWA_MY_ORDERS_KEY = 'cafecore_pwa_my_order_ids_v1';
let selectedOrderIdForTracking = null;

document.addEventListener('DOMContentLoaded', () => {
  try { initServiceWorker(); } catch (e) { console.warn('[PWA] SW init err:', e); }
  try { initPwaInstall(); } catch (e) { console.warn('[PWA] install init err:', e); }
  try { initIosBanner(); } catch (e) { console.warn('[PWA] iOS banner err:', e); }
  try { initMegaTabs(); } catch (e) { console.warn('[PWA] mega tabs err:', e); }
  try { initViewModeToggle(); } catch (e) { console.warn('[PWA] view mode err:', e); }
  try { renderMegaSubTabs(); } catch (e) { console.warn('[PWA] sub tabs err:', e); }
  try { renderMenuList(); } catch (e) { console.warn('[PWA] menu list err:', e); }
  try { updateCartUI(); } catch (e) { console.warn('[PWA] cart UI err:', e); }
  try { updateStampHeaderBadge(); } catch (e) { console.warn('[PWA] stamp badge err:', e); }
  try { setupEventListeners(); } catch (e) { console.warn('[PWA] listeners err:', e); }

  // 스토어 이벤트 구독 (내 주문 실시간 상태 변경 시 화면 갱신)
  try {
    window.cafeStore.subscribe((event) => {
      if (event.action === 'ORDER_STATUS_CHANGED' || event.action === 'NEW_ORDER') {
        renderMyOrderModalContent();
      }
      if (event.action === 'COUPON_ISSUED' || event.action === 'COUPON_USED') {
        updateStampHeaderBadge();
      }
    });
  } catch (e) { console.warn('[PWA] store sub err:', e); }

  // 인증 상태 변경 시 스탬프 및 헤더 갱신
  try {
    if (window.cafeAuth) {
      window.cafeAuth.onAuthStateChanged((user) => {
        updateStampHeaderBadge();
        updateAllMenuModalUserInfo(user);
      });
    }
  } catch (e) { console.warn('[PWA] auth change err:', e); }
});

/* ==========================================================================
   1. PWA & 배너 초기화
   ========================================================================== */
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => console.log('[PWA] SW registered:', reg.scope))
        .catch((err) => console.warn('[PWA] SW registration failed:', err));
    });
  }
}

function initPwaInstall() {
  const banner = document.getElementById('pwaBanner');
  const installBtn = document.getElementById('btnPwaInstall');
  const closeBtn = document.getElementById('btnPwaClose');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (banner) banner.style.display = 'flex';
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        alert('브라우저 설정 메뉴에서 "홈 화면에 추가"를 눌러주세요.');
        return;
      }
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log('[PWA] Install outcome:', outcome);
      deferredInstallPrompt = null;
      if (banner) banner.style.display = 'none';
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (banner) banner.style.display = 'none';
    });
  }
}

function initIosBanner() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  const banner = document.getElementById('iosInstallBanner');
  const closeBtn = document.getElementById('btnCloseIosBanner');

  if (isIos && !isStandalone && banner) {
    const dismissed = localStorage.getItem('cafecore_ios_banner_dismissed');
    if (!dismissed) {
      banner.style.display = 'block';
    }
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (banner) banner.style.display = 'none';
      localStorage.setItem('cafecore_ios_banner_dismissed', 'true');
    });
  }
}

/* ==========================================================================
   2. 1차 대분류 탭 & 2차 서브 필터 탭 (메가오더 스타일)
   ========================================================================== */
function enableHorizontalScroll(elem) {
  if (!elem || elem.dataset.scrollEnabled === 'true') return;
  elem.dataset.scrollEnabled = 'true';

  // 마우스 휠 및 터치 휠을 가로 스크롤로 부드럽게 변환
  elem.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      elem.scrollLeft += e.deltaY;
    }
  }, { passive: false });
}

window.selectMainCategory = function(mainKey) {
  currentMainCategory = mainKey;
  currentSubCategory = 'all'; // 소분류 초기화

  const tabs = document.querySelectorAll('.mega-main-tab');
  tabs.forEach((t) => {
    t.classList.toggle('active', t.dataset.main === mainKey);
  });

  renderMegaSubTabs();
  renderMenuList();
};

function initMegaTabs() {
  const tabContainer = document.querySelector('.mega-main-tab-bar');
  if (tabContainer) enableHorizontalScroll(tabContainer);

  const tabs = document.querySelectorAll('.mega-main-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      window.selectMainCategory(tab.dataset.main);
    });
  });
}

function renderMegaSubTabs() {
  const container = document.getElementById('megaSubTabBar');
  if (!container) return;

  const allItems = window.cafeStore.getMenuItems();
  let subTabsConfig = [];

  if (currentMainCategory === 'coffee') {
    const coffeeItems = allItems.filter((it) => it.category === 'coffee');
    const espCount = coffeeItems.filter((it) => it.subCategory === 'espresso').length;
    const latCount = coffeeItems.filter((it) => it.subCategory === 'latte').length;
    const cbCount = coffeeItems.filter((it) => it.subCategory === 'coldbrew').length;

    subTabsConfig = [
      { key: 'all', label: `전체 (${coffeeItems.length})` },
      { key: 'espresso', label: `에스프레소 (${espCount})` },
      { key: 'latte', label: `라떼 (${latCount})` },
      { key: 'coldbrew', label: `콜드브루 (${cbCount})` }
    ];
  } else if (currentMainCategory === 'decaf') {
    const decafItems = allItems.filter((it) => it.isDecaf || it.category === 'decaf');
    const espCount = decafItems.filter((it) => it.subCategory === 'espresso').length;
    const latCount = decafItems.filter((it) => it.subCategory === 'latte').length;
    const cbCount = decafItems.filter((it) => it.subCategory === 'coldbrew').length;

    subTabsConfig = [
      { key: 'all', label: `전체 (${decafItems.length})` },
      { key: 'espresso', label: `에스프레소 (${espCount})` },
      { key: 'latte', label: `라떼 (${latCount})` },
      { key: 'coldbrew', label: `콜드브루 (${cbCount})` }
    ];
  } else if (currentMainCategory === 'beverage') {
    const bevItems = allItems.filter((it) => ['beverage', 'ade', 'frappe', 'tea', 'smoothie'].includes(it.category));
    const adeCount = bevItems.filter((it) => it.subCategory === 'ade').length;
    const frappeCount = bevItems.filter((it) => it.subCategory === 'frappe').length;
    const smoothieCount = bevItems.filter((it) => it.subCategory === 'smoothie').length;
    const teaCount = bevItems.filter((it) => ['tea', 'non_coffee', 'tea_pleasure', 'classic'].includes(it.subCategory)).length;

    subTabsConfig = [
      { key: 'all', label: `전체 (${bevItems.length})` },
      { key: 'ade', label: `에이드 (${adeCount})` },
      { key: 'frappe', label: `프라페 (${frappeCount})` },
      { key: 'smoothie', label: `스무디&쥬스 (${smoothieCount})` },
      { key: 'tea', label: `티/음료 (${teaCount})` }
    ];
  } else {
    // new, recommend, all 일 때는 서브 탭바 숨김
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = subTabsConfig
    .map(
      (cfg) => `
    <button type="button" class="mega-sub-pill ${cfg.key === currentSubCategory ? 'active' : ''}" 
      data-sub="${cfg.key}" onclick="selectSubCategory('${cfg.key}')">
      ${cfg.label}
    </button>
  `
    )
    .join('') + '<div class="mega-sub-scroll-spacer" style="min-width: 28px; width: 28px; height: 10px; flex-shrink: 0; pointer-events: none;"></div>';

  // 가로 휠 스크롤 및 터치 부드러운 스크롤 지원
  enableHorizontalScroll(container);
}

function selectSubCategory(subKey) {
  currentSubCategory = subKey;
  document.querySelectorAll('.mega-sub-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.sub === subKey);
  });
  renderMenuList();
}

function initViewModeToggle() {
  const btnRow = document.getElementById('btnViewRow');
  const btnGrid = document.getElementById('btnViewGrid');
  const container = document.getElementById('menuGridMobile');

  if (btnRow && btnGrid && container) {
    btnRow.addEventListener('click', () => {
      btnRow.classList.add('active');
      btnGrid.classList.remove('active');
      container.classList.remove('view-grid');
      container.classList.add('view-row');
    });

    btnGrid.addEventListener('click', () => {
      btnGrid.classList.add('active');
      btnRow.classList.remove('active');
      container.classList.remove('view-row');
      container.classList.add('view-grid');
    });
  }
}

/* ==========================================================================
   3. 메뉴 리스트 렌더링 (가로형 리스트 기본 + 그리드 전환 지원)
   ========================================================================== */
function renderMenuList() {
  const listContainer = document.getElementById('menuGridMobile');
  const countElem = document.getElementById('menuItemCount');
  if (!listContainer) return;

  const allItems = window.cafeStore.getMenuItems();

  // 필터링 규칙
  const filtered = allItems.filter((item) => {
    // 1) 1차 탭 필터
    if (currentMainCategory === 'new') {
      if (!item.isNew) return false;
    } else if (currentMainCategory === 'recommend') {
      if (!item.isRecommended) return false;
    } else if (currentMainCategory === 'coffee') {
      if (item.category !== 'coffee') return false;
    } else if (currentMainCategory === 'decaf') {
      if (!item.isDecaf && item.category !== 'decaf') return false;
    } else if (currentMainCategory === 'beverage') {
      const bevCats = ['beverage', 'ade', 'frappe', 'tea', 'smoothie'];
      if (!bevCats.includes(item.category)) return false;
    }

    // 2) 2차 서브 탭 필터
    if (currentSubCategory !== 'all') {
      if (currentMainCategory === 'beverage' && currentSubCategory === 'tea') {
        const teaSubs = ['tea', 'non_coffee', 'tea_pleasure', 'classic'];
        if (!teaSubs.includes(item.subCategory)) return false;
      } else {
        if (item.subCategory !== currentSubCategory) return false;
      }
    }

    return true;
  });

  if (countElem) {
    countElem.textContent = filtered.length;
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 60px 16px; color: var(--color-text-sub); width: 100%;">
        <div style="font-size: 38px; margin-bottom: 10px;">☕</div>
        <div style="font-size: 15px; font-weight: 700; color: var(--color-primary); margin-bottom: 4px;">해당 분류의 메뉴가 준비 중입니다.</div>
        <div style="font-size: 12px; color: var(--color-text-muted);">다른 카테고리를 선택해 보세요.</div>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filtered
    .map((item) => {
      // 장바구니 내 수량 확인
      const inCartItems = cart.filter((c) => c.menuId === item.id);
      const totalQtyInCart = inCartItems.reduce((sum, c) => sum + c.quantity, 0);

      // 배지 구성
      const badgeList = [];
      if (item.isNew) badgeList.push('<span class="tag-new">NEW</span>');
      if (item.isRecommended) badgeList.push('<span class="tag-rec">추천</span>');
      if (item.isDecaf) badgeList.push('<span class="tag-decaf">디카페인</span>');

      // ICE/HOT 온도 뱃지
      let tempBadge = '';
      if (item.options?.temperature?.length === 1 && item.options.temperature[0] === 'ICE') {
        tempBadge = '<span class="pill-temp ice">ICE ONLY</span>';
      } else {
        tempBadge = '<span class="pill-temp both">ICE / HOT</span>';
      }

      const actionControl = totalQtyInCart > 0
        ? `
        <div class="row-qty-stepper" onclick="event.stopPropagation()">
          <button type="button" class="btn-step-sm" onclick="quickChangeQty('${item.id}', -1)" aria-label="1잔 빼기">−</button>
          <span class="step-num">${totalQtyInCart}</span>
          <button type="button" class="btn-step-sm" onclick="quickChangeQty('${item.id}', 1)" aria-label="1잔 더하기">+</button>
        </div>
      `
        : `
        <button type="button" class="btn-row-add" onclick="event.stopPropagation(); openPwaOptionModal('${item.id}')" aria-label="${item.name} 주문 담기">
          +
        </button>
      `;

      return `
      <div class="row-menu-card" data-id="${item.id}" onclick="openPwaOptionModal('${item.id}')">
        <div class="row-thumb-wrap">
          <img src="${item.image}" alt="${item.name}" class="row-thumb-img" loading="lazy">
          <div class="row-badge-stack">${badgeList.join('')}</div>
        </div>
        <div class="row-info-wrap">
          <div class="row-title-row">
            <span class="row-menu-name">${item.name}</span>
            ${tempBadge}
          </div>
          <div class="row-menu-desc">${item.description || item.subCategory || ''}</div>
          <div class="row-bottom-bar">
            <span class="row-price">${item.price.toLocaleString()}원</span>
            <div class="row-action-area">
              ${actionControl}
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join('');
}

/* ==========================================================================
   4. 상세 옵션 바텀시트 모달
   ========================================================================== */
function openPwaOptionModal(menuId) {
  const menu = window.cafeStore.getMenuItemById(menuId);
  if (!menu) return;

  pwaPendingItem = menu;

  // 상태 초기화
  pwaSelectedTemp = 'ICE';
  pwaSelectedSize = 'Regular';
  pwaSelectedSizeAdd = 0;
  pwaSelectedShot = '기본';
  pwaSelectedShotAdd = 0;
  pwaSelectedSyrup = '기본';
  pwaSelectedSyrupAdd = 0;
  pwaSelectedIce = '보통';

  document.getElementById('pwaOptName').textContent = menu.name;
  document.getElementById('pwaOptBasePrice').textContent = `(기본 ${menu.price.toLocaleString()}원)`;
  document.getElementById('pwaOptThumb').src = menu.image;

  // ICE 전용 여부 확인
  const isIceOnly = menu.options?.temperature?.length === 1 && menu.options?.temperature[0] === 'ICE';
  const hotBtn = document.getElementById('btnPwaTempHot');
  const tempNotice = document.getElementById('pwaTempNotice');

  if (isIceOnly) {
    if (hotBtn) hotBtn.classList.add('disabled');
    if (tempNotice) tempNotice.style.display = 'block';
  } else {
    if (hotBtn) hotBtn.classList.remove('disabled');
    if (tempNotice) tempNotice.style.display = 'none';
  }

  // 샷 추가 영역: 커피 종류에만 표시
  const shotSection = document.getElementById('pwaShotSection');
  const isCoffee = Boolean(menu.isCoffee || menu.category === 'coffee' || menu.category === 'decaf');
  if (shotSection) {
    shotSection.style.display = isCoffee ? 'block' : 'none';
  }

  resetPwaOptionButtons();
  updatePwaOptionPrice();

  document.getElementById('pwaOptionModal').classList.add('open');
}

function resetPwaOptionButtons() {
  document.querySelectorAll('.btn-pwa-temp').forEach((b) => {
    b.classList.toggle('selected', b.dataset.temp === pwaSelectedTemp);
  });
  document.querySelectorAll('.btn-pwa-size').forEach((b) => {
    b.classList.toggle('selected', b.dataset.size === pwaSelectedSize);
  });
  document.querySelectorAll('.btn-pwa-shot').forEach((b) => {
    b.classList.toggle('selected', b.dataset.shot === pwaSelectedShot);
  });
  document.querySelectorAll('.btn-pwa-syrup').forEach((b) => {
    b.classList.toggle('selected', b.dataset.syrup === pwaSelectedSyrup);
  });
  document.querySelectorAll('.btn-pwa-ice').forEach((b) => {
    b.classList.toggle('selected', b.dataset.ice === pwaSelectedIce);
  });
}

function updatePwaOptionPrice() {
  if (!pwaPendingItem) return;
  const currentTotal =
    pwaPendingItem.price +
    pwaSelectedSizeAdd +
    pwaSelectedShotAdd +
    pwaSelectedSyrupAdd;

  const priceElem = document.getElementById('pwaOptPrice');
  if (priceElem) {
    priceElem.textContent = `${currentTotal.toLocaleString()}원`;
  }
}

function pwaSelectTemp(temp) {
  if (!pwaPendingItem) return;
  const isIceOnly =
    pwaPendingItem.options?.temperature?.length === 1 &&
    pwaPendingItem.options?.temperature[0] === 'ICE';

  if (temp === 'HOT' && isIceOnly) {
    alert('해당 음료는 ICE 전용 음료입니다.');
    return;
  }

  pwaSelectedTemp = temp;
  document.querySelectorAll('.btn-pwa-temp').forEach((b) => {
    b.classList.toggle('selected', b.dataset.temp === temp);
  });

  const iceSection = document.getElementById('pwaIceSection');
  if (iceSection) {
    iceSection.style.display = temp === 'ICE' ? 'block' : 'none';
  }
}

function pwaSelectSize(size, addPrice) {
  pwaSelectedSize = size;
  pwaSelectedSizeAdd = addPrice;
  document.querySelectorAll('.btn-pwa-size').forEach((b) => {
    b.classList.toggle('selected', b.dataset.size === size);
  });
  updatePwaOptionPrice();
}

function pwaSelectShot(shot, addPrice) {
  pwaSelectedShot = shot;
  pwaSelectedShotAdd = addPrice;
  document.querySelectorAll('.btn-pwa-shot').forEach((b) => {
    b.classList.toggle('selected', b.dataset.shot === shot);
  });
  updatePwaOptionPrice();
}

function pwaSelectSyrup(syrup, addPrice) {
  pwaSelectedSyrup = syrup;
  pwaSelectedSyrupAdd = addPrice;
  document.querySelectorAll('.btn-pwa-syrup').forEach((b) => {
    b.classList.toggle('selected', b.dataset.syrup === syrup);
  });
  updatePwaOptionPrice();
}

function pwaSelectIce(ice) {
  pwaSelectedIce = ice;
  document.querySelectorAll('.btn-pwa-ice').forEach((b) => {
    b.classList.toggle('selected', b.dataset.ice === ice);
  });
}

function confirmPwaOption() {
  try {
    if (!pwaPendingItem) return;

    const unitPrice =
      pwaPendingItem.price +
      pwaSelectedSizeAdd +
      pwaSelectedShotAdd +
      pwaSelectedSyrupAdd;

    const parts = [];
    parts.push(pwaSelectedSize);
    if ((pwaPendingItem.isCoffee || pwaPendingItem.category === 'coffee' || pwaPendingItem.category === 'decaf') && pwaSelectedShot !== '기본') {
      parts.push(pwaSelectedShot);
    }
    if (pwaSelectedSyrup !== '기본') {
      parts.push(pwaSelectedSyrup);
    }
    if (pwaSelectedTemp === 'ICE' && pwaSelectedIce !== '보통') {
      parts.push(`얼음 ${pwaSelectedIce}`);
    }
    const optionText = parts.length > 0 ? parts.join(' · ') : `${pwaSelectedSize}`;

    const existing = cart.find(
      (c) =>
        c.menuId === pwaPendingItem.id &&
        c.options?.temperature === pwaSelectedTemp &&
        c.options?.size === pwaSelectedSize &&
        c.options?.extraShot === pwaSelectedShot &&
        c.options?.syrup === pwaSelectedSyrup &&
        c.options?.iceAmount === pwaSelectedIce
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        menuId: pwaPendingItem.id,
        name: pwaPendingItem.name,
        price: unitPrice,
        basePrice: pwaPendingItem.price,
        quantity: 1,
        image: pwaPendingItem.image,
        options: {
          temperature: pwaSelectedTemp,
          size: pwaSelectedSize,
          extraShot: pwaSelectedShot,
          syrup: pwaSelectedSyrup,
          iceAmount: pwaSelectedIce,
          optionText: optionText
        }
      });
    }

    const addedName = pwaPendingItem.name;
    const modal = document.getElementById('pwaOptionModal');
    if (modal) modal.classList.remove('open');
    pwaPendingItem = null;

    showToast(`[${addedName}] 1잔을 담았습니다.`);
    updateCartUI();
    renderMenuList();
    renderCartSheetModal();
  } catch (err) {
    console.error('[PWA] 장바구니 담기 오류:', err);
    alert('장바구니 담기 처리 중 문제가 발생했습니다: ' + err.message);
  }
}

function quickChangeQty(menuId, delta) {
  const existingIdx = cart.findIndex((c) => c.menuId === menuId);
  if (existingIdx >= 0) {
    cart[existingIdx].quantity += delta;
    if (cart[existingIdx].quantity <= 0) {
      const removedName = cart[existingIdx].name;
      cart.splice(existingIdx, 1);
      showToast(`[${removedName}]이(가) 장바구니에서 제외되었습니다.`);
    }
  }
  updateCartUI();
  renderMenuList();
  renderCartSheetModal();
}

function removeCartItem(idx) {
  if (cart[idx]) {
    const name = cart[idx].name;
    cart.splice(idx, 1);
    showToast(`[${name}]이(가) 장바구니에서 삭제되었습니다.`);
    updateCartUI();
    renderMenuList();
    renderCartSheetModal();
  }
}

function clearAllCart() {
  if (cart.length === 0) return;
  if (confirm('장바구니의 모든 메뉴를 비우시겠습니까?')) {
    cart = [];
    appliedCoupon = null;
    showToast('장바구니를 비웠습니다.');
    updateCartUI();
    renderMenuList();
    renderCartSheetModal();
  }
}

/* ==========================================================================
   5. 장바구니 UI 및 쿠폰 할인 적용
   ========================================================================== */
function calculateCartTotals() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let discount = 0;
  if (appliedCoupon && cart.length > 0) {
    if (appliedCoupon.type === 'americano') {
      // 아메리카노 메뉴가 있으면 해당 메뉴 1잔 가격, 없으면 2,000원 할인
      const ameItem = cart.find((it) => it.name.includes('아메리카노'));
      discount = ameItem ? ameItem.price : Math.min(2000, subtotal);
    } else if (appliedCoupon.type === 'any_drink') {
      // 모든 음료 중 가장 비싼 1잔 가격 100% 할인
      const maxPrice = Math.max(...cart.map((it) => it.price));
      discount = maxPrice;
    }
  }

  const finalTotal = Math.max(0, subtotal - discount);
  return { totalCount, subtotal, discount, finalTotal };
}

function updateCartUI() {
  const { totalCount, finalTotal } = calculateCartTotals();

  const headerBadge = document.getElementById('headerCartBadge');
  if (headerBadge) {
    if (totalCount > 0) {
      headerBadge.style.display = 'block';
      headerBadge.textContent = totalCount;
    } else {
      headerBadge.style.display = 'none';
    }
  }

  const bottomBadge = document.getElementById('bottomCartBadge');
  const bottomTotal = document.getElementById('bottomCartTotal');
  const submitBtn = document.getElementById('btnSubmitOrder');

  if (bottomBadge) {
    if (totalCount > 0) {
      bottomBadge.style.display = 'block';
      bottomBadge.textContent = totalCount;
    } else {
      bottomBadge.style.display = 'none';
    }
  }

  if (bottomTotal) {
    if (totalCount > 0) {
      bottomTotal.textContent = `${totalCount}잔 · ${finalTotal.toLocaleString()}원`;
      bottomTotal.style.color = '#111827';
      bottomTotal.style.fontWeight = '900';
    } else {
      bottomTotal.textContent = '0잔 · 0원';
      bottomTotal.style.color = 'var(--color-text-muted)';
      bottomTotal.style.fontWeight = '700';
    }
  }

  if (submitBtn) {
    submitBtn.disabled = totalCount === 0;
  }
}

function renderCartSheetModal() {
  const container = document.getElementById('cartSheetItemList');
  const countElem = document.getElementById('cartSheetTotalCount');
  const totalElem = document.getElementById('cartSheetTotalPrice');

  if (!container) return;

  const { totalCount, subtotal, discount, finalTotal } = calculateCartTotals();

  if (countElem) countElem.textContent = `총 ${totalCount}잔`;
  if (totalElem) totalElem.textContent = `${finalTotal.toLocaleString()}원`;

  // 쿠폰 할인 UI 갱신
  const couponTitleElem = document.getElementById('cartAppliedCouponTitle');
  const discountRow = document.getElementById('cartDiscountRow');
  const discountAmountElem = document.getElementById('cartDiscountAmount');

  if (couponTitleElem) {
    if (appliedCoupon) {
      couponTitleElem.textContent = `[${appliedCoupon.name}] 적용됨`;
      couponTitleElem.style.color = '#B45309';
      couponTitleElem.style.fontWeight = '700';
    } else {
      couponTitleElem.textContent = '적용 안 됨';
      couponTitleElem.style.color = 'var(--color-text-sub)';
      couponTitleElem.style.fontWeight = 'normal';
    }
  }

  if (discountRow && discountAmountElem) {
    if (discount > 0) {
      discountRow.style.display = 'flex';
      discountAmountElem.textContent = `-${discount.toLocaleString()}원`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--color-text-muted);">
        <div style="font-size: 32px; margin-bottom: 8px;">🛒</div>
        장바구니가 비어 있습니다.<br>
        원하시는 음료를 담아보세요.
      </div>
    `;
    return;
  }

  container.innerHTML = cart
    .map(
      (item, idx) => `
    <div class="cart-sheet-item">
      <div class="cart-sheet-item-left">
        <img src="${item.image}" alt="${item.name}" class="cart-sheet-thumb">
        <div>
          <div class="cart-sheet-name">${item.name} (${item.options?.temperature || 'ICE'})</div>
          <div style="font-size: 11px; color: var(--color-primary); font-weight: 700; margin-top: 2px;">
            ${item.options?.optionText || ''}
          </div>
          <div class="cart-sheet-price">${item.price.toLocaleString()}원</div>
        </div>
      </div>
      <div class="cart-sheet-item-right">
        <div class="mobile-card-stepper">
          <button type="button" class="btn-card-step" onclick="changeCartIndexQty(${idx}, -1)">−</button>
          <span class="card-step-val">${item.quantity}</span>
          <button type="button" class="btn-card-step" onclick="changeCartIndexQty(${idx}, 1)">+</button>
        </div>
        <button type="button" class="btn-cart-item-del" onclick="removeCartItem(${idx})" title="삭제">✕</button>
      </div>
    </div>
  `
    )
    .join('');
}

function renderCartCouponPicker() {
  const pickerArea = document.getElementById('cartCouponPickerArea');
  if (!pickerArea) return;

  const user = window.cafeAuth?.getCurrentUser();
  const userId = user ? user.id : 'guest';
  const myCoupons = window.cafeStore.getUserCoupons(userId);

  if (myCoupons.length === 0) {
    pickerArea.innerHTML = `
      <div style="padding:10px 14px; background:#F8FAFC; border:1px solid var(--color-border); border-radius:10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
        <span style="color:var(--color-text-sub);">🎟️ 사용 가능한 쿠폰: 0장</span>
        <button type="button" onclick="openCouponBookModal()" style="background:none; border:none; color:var(--color-primary); font-weight:700; cursor:pointer;">스탬프판 보기 ›</button>
      </div>
    `;
    return;
  }

  pickerArea.innerHTML = `
    <div style="padding:10px 14px; background:#FEF3C7; border:1.5px solid #F59E0B; border-radius:10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong style="color:#B45309;">🎟️ 보유 쿠폰 ${myCoupons.length}장:</strong>
        <span style="margin-left:6px; color:#92400E;">${appliedCoupon ? `[${appliedCoupon.name}] 적용됨` : '선택 안 됨'}</span>
      </div>
      <div style="display:flex; gap:6px;">
        ${appliedCoupon ? `<button type="button" onclick="removeAppliedCoupon()" style="background:#EF4444; color:white; border:none; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">취소</button>` : ''}
        <button type="button" onclick="openCouponPickerForCart()" style="background:var(--color-primary); color:white; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">
          ${appliedCoupon ? '변경' : '쿠폰 적용'}
        </button>
      </div>
    </div>
  `;
}

function openCouponPickerForCart() {
  const user = window.cafeAuth?.getCurrentUser();
  const userId = user ? user.id : 'guest';
  const myCoupons = window.cafeStore.getUserCoupons(userId);

  if (myCoupons.length === 0) {
    alert('현재 보유 중인 쿠폰이 없습니다.\n스탬프 10잔을 적립하시면 무료 쿠폰이 자동 지급됩니다!');
    return;
  }

  // 쿠폰북 모달의 [보유 쿠폰] 탭을 시원하게 오픈
  closeCartSheetModal();
  openCouponBookModal();
  switchCouponTab('coupon');
}

function removeAppliedCoupon() {
  appliedCoupon = null;
  showToast('쿠폰 적용이 해제되었습니다.');
  updateCartUI();
  renderCartSheetModal();
}

function changeCartIndexQty(idx, delta) {
  if (cart[idx]) {
    cart[idx].quantity += delta;
    if (cart[idx].quantity <= 0) {
      cart.splice(idx, 1);
    }
    updateCartUI();
    renderMenuList();
    renderCartSheetModal();
  }
}

function openCartSheetModal() {
  renderCartSheetModal();
  const modal = document.getElementById('cartSheetModal');
  if (modal) modal.classList.add('open');
}

function closeCartSheetModal() {
  const modal = document.getElementById('cartSheetModal');
  if (modal) modal.classList.remove('open');
}

/* ==========================================================================
   6. 스탬프 & 쿠폰북 모달 로직 (★ 10잔 아메리카노 / 20잔 전음료 무료 ★)
   ========================================================================== */
function getActiveUserKey() {
  const user = window.cafeAuth?.getCurrentUser();
  if (user) {
    return user.email || user.uid || user.id || 'guest';
  }
  return 'guest';
}

function updateStampHeaderBadge() {
  const userKey = getActiveUserKey();
  const coupons = window.cafeStore.getUserCoupons(userKey);
  const badge = document.getElementById('headerStampCountBadge');

  if (badge) {
    if (coupons.length > 0) {
      badge.style.display = 'inline-flex';
      badge.textContent = coupons.length;
    } else {
      badge.style.display = 'none';
    }
  }
}

function openCouponBookModal() {
  const userKey = getActiveUserKey();
  const stampInfo = window.cafeStore.getUserStampInfo(userKey);
  const coupons = window.cafeStore.getUserCoupons(userKey);

  // 상단 요약 배너 업데이트
  const totalCupsElem = document.getElementById('userTotalCupsText');
  const nextCupsElem = document.getElementById('userCupsUntilNextCoupon');
  const couponCountElem = document.getElementById('couponCountText');

  if (totalCupsElem) totalCupsElem.textContent = `${stampInfo.totalCups}잔`;
  if (nextCupsElem) nextCupsElem.textContent = `${stampInfo.cupsUntilNext}잔 남음`;
  if (couponCountElem) couponCountElem.textContent = coupons.length;

  // 1) 1~10번 스탬프 보드 렌더링
  const grid10 = document.getElementById('stampGrid10');
  if (grid10) {
    const stamped10 = Math.min(10, stampInfo.currentCycleCups);
    let html10 = '';
    for (let i = 1; i <= 10; i++) {
      const isStamped = i <= stamped10;
      const isMilestone = i === 10;
      html10 += `
        <div class="stamp-circle ${isStamped ? 'stamped' : ''} ${isMilestone ? 'milestone' : ''}">
          ${isStamped ? '✓' : (isMilestone ? '☕' : i)}
          ${isMilestone ? '<span class="stamp-milestone-text">무료</span>' : ''}
        </div>
      `;
    }
    grid10.innerHTML = html10;
  }

  // 2) 11~20번 스탬프 보드 렌더링
  const grid20 = document.getElementById('stampGrid20');
  if (grid20) {
    const stamped20 = stampInfo.currentCycleCups >= 10 ? Math.min(20, stampInfo.currentCycleCups) : 10;
    let html20 = '';
    for (let i = 11; i <= 20; i++) {
      const isStamped = i <= stampInfo.currentCycleCups;
      const isMilestone = i === 20;
      html20 += `
        <div class="stamp-circle ${isStamped ? 'stamped' : ''} ${isMilestone ? 'milestone-vip' : ''}">
          ${isStamped ? '✓' : (isMilestone ? '🍹' : i)}
          ${isMilestone ? '<span class="stamp-milestone-text">VIP무료</span>' : ''}
        </div>
      `;
    }
    grid20.innerHTML = html20;
  }

  // 3) 보유 쿠폰 탭 렌더링
  const couponContainer = document.getElementById('couponItemsContainer');
  if (couponContainer) {
    if (coupons.length === 0) {
      couponContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: var(--color-text-sub);">
          <div style="font-size: 32px; margin-bottom: 8px;">🎟️</div>
          보유 중인 쿠폰이 없습니다.<br>
          스탬프 10잔을 적립하시면 무료 쿠폰이 자동 지급됩니다!
        </div>
      `;
    } else {
      couponContainer.innerHTML = coupons
        .map(
          (c) => `
        <div class="coupon-ticket-card">
          <div class="ticket-left">
            <span class="ticket-type-badge">${c.type === 'americano' ? '아메리카노 무료' : '전 음료 무료'}</span>
            <div class="ticket-title">${c.name}</div>
            <div class="ticket-desc">${c.benefit}</div>
            <div class="ticket-expiry">유효기간: 발급일로부터 30일 이내</div>
          </div>
          <div class="ticket-right">
            <button type="button" class="btn-use-coupon" onclick="applyCouponAndClose('${c.id}')">
              사용하기
            </button>
          </div>
        </div>
      `
        )
        .join('');
    }
  }

  const modal = document.getElementById('couponBookModal');
  if (modal) modal.classList.add('open');
}

function closeCouponBookModal() {
  const modal = document.getElementById('couponBookModal');
  if (modal) modal.classList.remove('open');
}

function switchCouponTab(tab) {
  const tabStamp = document.getElementById('tabStampCard');
  const tabCoupon = document.getElementById('tabMyCoupons');
  const paneStamp = document.getElementById('stampCardPane');
  const paneCoupon = document.getElementById('couponListPane');

  if (tab === 'stamp') {
    if (tabStamp) tabStamp.classList.add('active');
    if (tabCoupon) tabCoupon.classList.remove('active');
    if (paneStamp) paneStamp.style.display = 'block';
    if (paneCoupon) paneCoupon.style.display = 'none';
  } else {
    if (tabCoupon) tabCoupon.classList.add('active');
    if (tabStamp) tabStamp.classList.remove('active');
    if (paneCoupon) paneCoupon.style.display = 'block';
    if (paneStamp) paneStamp.style.display = 'none';
  }
}

function applyCouponAndClose(couponId) {
  const user = window.cafeAuth?.getCurrentUser();
  const userId = user ? user.id : 'guest';
  const coupons = window.cafeStore.getUserCoupons(userId);
  const target = coupons.find((c) => c.id === couponId);

  if (target) {
    appliedCoupon = target;
    showToast(`[${target.name}]이(가) 장바구니에 적용되었습니다.`);
    closeCouponBookModal();
    openCartSheetModal();
  }
}

/* ==========================================================================
   7. 메가오더 전체메뉴(☰) 모달 서랍 제어
   ========================================================================== */
function openAllMenuModal() {
  const user = window.cafeAuth?.getCurrentUser();
  updateAllMenuModalUserInfo(user);
  const modal = document.getElementById('allMenuModal');
  if (modal) modal.classList.add('open');
}

function closeAllMenuModal() {
  const modal = document.getElementById('allMenuModal');
  if (modal) modal.classList.remove('open');
}

function updateAllMenuModalUserInfo(user) {
  const nameElem = document.getElementById('allMenuUserName');
  const subElem = document.getElementById('allMenuUserSub');
  const couponCountElem = document.getElementById('allMenuCouponCount');

  const userKey = getActiveUserKey();
  const coupons = window.cafeStore.getUserCoupons(userKey);
  const stampInfo = window.cafeStore.getUserStampInfo(userKey);

  if (user) {
    if (nameElem) nameElem.textContent = `${user.name || user.email || '회원'}님`;
    if (subElem) subElem.textContent = `누적 ${stampInfo.totalCups}잔 스탬프 적립판 보기 ›`;
    if (couponCountElem) couponCountElem.textContent = `${coupons.length}장`;
  } else {
    if (nameElem) nameElem.textContent = '비회원 고객님';
    if (subElem) subElem.textContent = stampInfo.totalCups > 0 ? `누적 ${stampInfo.totalCups}잔 스탬프 적립판 보기 ›` : '로그인 후 10잔 구매 시 아메리카노 증정 ›';
    if (couponCountElem) couponCountElem.textContent = `${coupons.length}장`;
  }
}

/* ==========================================================================
   8. 주문 생성 및 실시간 Firestore 연동
   ========================================================================== */
function getMyOrderIds() {
  try {
    const data = localStorage.getItem(PWA_MY_ORDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveMyOrderId(orderId) {
  try {
    const list = getMyOrderIds();
    if (!list.includes(orderId)) {
      list.unshift(orderId);
      localStorage.setItem(PWA_MY_ORDERS_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn(e);
  }
}

function submitOrder() {
  if (cart.length === 0) {
    alert('장바구니에 담긴 음료가 없습니다.\n메뉴에서 음료를 먼저 담아주세요.');
    return;
  }

  closeCartSheetModal();

  const user = window.cafeAuth?.getCurrentUser();
  const userKey = getActiveUserKey();
  const userName = user ? (user.name || user.email) : '비회원 고객';

  const { discount, finalTotal } = calculateCartTotals();

  // 스토어 주문 생성 (Cloud Firestore 실시간 연동 포함)
  const order = window.cafeStore.createOrder({
    channel: 'pwa',
    items: cart,
    userId: userKey,
    userName: userName,
    appliedCoupon: appliedCoupon,
    discountAmount: discount,
    finalAmount: finalTotal
  });

  // 쿠폰이 적용되었다면 사용 완료 처리
  if (appliedCoupon) {
    window.cafeStore.useCoupon(userKey, appliedCoupon.id);
  }

  saveMyOrderId(order.id);
  selectedOrderIdForTracking = order.id;

  // 장바구니 초기화
  cart = [];
  appliedCoupon = null;
  updateCartUI();
  renderMenuList();
  updateStampHeaderBadge();
  updateAllMenuModalUserInfo(user);

  // 주문 완료 팝업
  const modal = document.getElementById('orderSuccessModal');
  const numElem = document.getElementById('successOrderNumber');
  const sumElem = document.getElementById('successOrderSummary');

  if (numElem) numElem.textContent = `#${order.orderNumber}`;
  if (sumElem) {
    const totalCount = order.items.reduce((s, i) => s + i.quantity, 0);
    const stampNotice = ` (스탬프 +${totalCount}개 적립 완료!)`;
    sumElem.textContent = `${order.items[0].name} 포함 총 ${totalCount}잔 · ${order.totalAmount.toLocaleString()}원${stampNotice}`;
  }

  if (modal) modal.classList.add('open');
}

/* ==========================================================================
   9. 내 주문 실시간 추적 모달
   ========================================================================== */
function openMyOrderModal() {
  renderMyOrderModalContent();
  const modal = document.getElementById('myOrderModal');
  if (modal) modal.classList.add('open');
}

function closeMyOrderModal() {
  const modal = document.getElementById('myOrderModal');
  if (modal) modal.classList.remove('open');
}

function renderMyOrderModalContent() {
  const container = document.getElementById('myOrderTrackingBody');
  if (!container) return;

  const myOrderIds = getMyOrderIds();
  const allOrders = window.cafeStore.getOrders();
  const myOrders = allOrders.filter((o) => myOrderIds.includes(o.id));

  if (myOrders.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 16px; color: var(--color-text-sub);">
        <div style="font-size: 40px; margin-bottom: 12px;">☕</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--color-primary); margin-bottom: 6px;">
          진행 중인 주문이 없습니다.
        </div>
        <div style="font-size: 13px; color: var(--color-text-muted); line-height: 1.6;">
          원하시는 음료를 선택하시고 [주문하기]를 누르시면<br>실시간 제조 상태가 여기에 표시됩니다.
        </div>
      </div>
    `;
    return;
  }

  let currentOrder = myOrders.find((o) => o.id === selectedOrderIdForTracking);
  if (!currentOrder) {
    currentOrder = myOrders[0];
    selectedOrderIdForTracking = currentOrder.id;
  }

  const orderSelectorTabs =
    myOrders.length > 1
      ? `
    <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--color-border);">
      ${myOrders
        .map(
          (o) => `
        <button type="button" 
          onclick="selectTrackingOrder('${o.id}')"
          style="flex-shrink: 0; padding: 6px 14px; border-radius: var(--radius-full); font-size: 13px; font-weight: 700; border: 1.5px solid ${
            o.id === currentOrder.id ? 'var(--color-primary)' : 'var(--color-border)'
          }; background: ${
            o.id === currentOrder.id ? 'var(--color-primary)' : '#FFFFFF'
          }; color: ${o.id === currentOrder.id ? '#FFFFFF' : 'var(--color-text-main)'}; cursor: pointer;">
          #${o.orderNumber} (${getStatusLabel(o.status)})
        </button>
      `
        )
        .join('')}
    </div>
  `
      : '';

  const steps = [
    { key: 'received', label: '접수완료' },
    { key: 'cooking', label: '제조 중' },
    { key: 'ready', label: '픽업 준비완료' }
  ];

  const currentStepIdx = steps.findIndex((s) => s.key === currentOrder.status);

  const stepperHtml = `
    <div class="order-status-stepper">
      ${steps
        .map((step, idx) => {
          let stateCls = '';
          if (idx < currentStepIdx || currentOrder.status === 'completed') {
            stateCls = 'completed';
          } else if (idx === currentStepIdx) {
            stateCls = 'active';
          }
          return `
          <div class="step-item ${stateCls}">
            <div class="step-dot">${idx + 1}</div>
            <div class="step-label">${step.label}</div>
          </div>
        `;
        })
        .join('')}
    </div>
  `;

  const itemsHtml = currentOrder.items
    .map(
      (item) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--color-border); font-size: 13px;">
      <div>
        <span style="font-weight: 700;">${item.name} (${item.options?.temperature || 'ICE'})</span>
        <span style="color: var(--color-text-muted);"> × ${item.quantity}</span>
        ${item.options?.optionText ? `<div style="font-size: 11px; color: var(--color-primary);">${item.options.optionText}</div>` : ''}
      </div>
      <span style="font-weight: 700;">${(item.price * item.quantity).toLocaleString()}원</span>
    </div>
  `
    )
    .join('');

  container.innerHTML = `
    ${orderSelectorTabs}
    
    <div style="background: var(--color-bg-sub); border-radius: var(--radius-md); padding: 18px; text-align: center; margin-bottom: 18px;">
      <span style="font-size: 13px; color: var(--color-text-sub);">주문 번호</span>
      <div style="font-size: 36px; font-weight: 900; color: var(--color-primary); letter-spacing: -1px;">
        #${currentOrder.orderNumber}
      </div>
      <div style="font-size: 14px; font-weight: 800; color: var(--color-text-main); margin-top: 4px;">
        상태: <span style="color: ${getStatusColor(currentOrder.status)}">${getStatusLabel(currentOrder.status)}</span>
      </div>
    </div>

    ${stepperHtml}

    <div style="margin-top: 20px;">
      <h4 style="font-size: 14px; font-weight: 800; margin-bottom: 10px; color: var(--color-text-main);">주문 내역</h4>
      ${itemsHtml}
      <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 15px; font-weight: 900; color: var(--color-primary);">
        <span>총 결제금액</span>
        <span>${currentOrder.totalAmount.toLocaleString()}원</span>
      </div>
    </div>
  `;
}

function selectTrackingOrder(orderId) {
  selectedOrderIdForTracking = orderId;
  renderMyOrderModalContent();
}

function getStatusLabel(status) {
  switch (status) {
    case 'received': return '접수 완료';
    case 'cooking': return '제조 중 ☕';
    case 'ready': return '픽업 준비완료 🔔';
    case 'completed': return '수령 완료';
    default: return status;
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'received': return '#D97706';
    case 'cooking': return '#2563EB';
    case 'ready': return '#16A34A';
    case 'completed': return '#64748B';
    default: return 'var(--color-primary)';
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  // 이전 토스트가 있으면 즉시 제거하여 겹침 방지
  container.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.innerHTML = `
    <span class="toast-icon">✓</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fadeout');
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 300);
  }, 2300);
}

/* ==========================================================================
   10. 전역 이벤트 리스너 바인딩 & 윈도우 등록
   ========================================================================== */
function setupEventListeners() {
  document.getElementById('bottomCartSummaryArea')?.addEventListener('click', openCartSheetModal);
  document.getElementById('headerCartBtn')?.addEventListener('click', openCartSheetModal);
  document.getElementById('btnCloseCartSheet')?.addEventListener('click', closeCartSheetModal);
  document.getElementById('btnClearAllCart')?.addEventListener('click', clearAllCart);

  // 옵션 모달 바인딩
  document.getElementById('btnClosePwaOption')?.addEventListener('click', () => {
    document.getElementById('pwaOptionModal').classList.remove('open');
    pwaPendingItem = null;
  });
  document.getElementById('btnPwaConfirmOption')?.addEventListener('click', confirmPwaOption);

  document.getElementById('btnSubmitOrder')?.addEventListener('click', submitOrder);
  document.getElementById('btnSheetSubmitOrder')?.addEventListener('click', submitOrder);

  document.getElementById('btnCloseSuccessModal')?.addEventListener('click', () => {
    const modal = document.getElementById('orderSuccessModal');
    if (modal) modal.classList.remove('open');
  });

  document.getElementById('btnMyOrders')?.addEventListener('click', openMyOrderModal);
  document.getElementById('btnCloseMyOrderModal')?.addEventListener('click', closeMyOrderModal);
}

// 전역 윈도우 스코프 함수 노출
window.openCouponBookModal = openCouponBookModal;
window.closeCouponBookModal = closeCouponBookModal;
window.switchCouponTab = switchCouponTab;
window.applyCouponAndClose = applyCouponAndClose;
window.openCouponPickerForCart = openCouponPickerForCart;
window.removeAppliedCoupon = removeAppliedCoupon;
window.openAllMenuModal = openAllMenuModal;
window.closeAllMenuModal = closeAllMenuModal;
window.selectSubCategory = selectSubCategory;
window.quickChangeQty = quickChangeQty;
window.openPwaOptionModal = openPwaOptionModal;
window.pwaSelectTemp = pwaSelectTemp;
window.pwaSelectSize = pwaSelectSize;
window.pwaSelectShot = pwaSelectShot;
window.pwaSelectSyrup = pwaSelectSyrup;
window.pwaSelectIce = pwaSelectIce;
window.confirmPwaOption = confirmPwaOption;
window.changeCartIndexQty = changeCartIndexQty;
window.removeCartItem = removeCartItem;
window.selectTrackingOrder = selectTrackingOrder;
window.openMyOrderModal = openMyOrderModal;
window.closeMyOrderModal = closeMyOrderModal;
