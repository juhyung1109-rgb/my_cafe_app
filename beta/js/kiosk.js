/**
 * CAFE CORE - Kiosk Display Logic (kiosk.js)
 * - 12종 음료 카테고리 필터링 (커피, 티&아이스티, 에이드, 스무디)
 * - 전문 카페 수준의 다채로운 옵션 모달 (온도, 사이즈, 커피 전용 샷추가, 시럽/당도, 얼음량)
 * - 옵션 선택에 따른 실시간 단가 및 장바구니/영수증 완벽 연동
 */

let currentCategory = 'all';

// 키오스크 장바구니 초기 상태: 0잔 (선택 전)
let kioskCart = [];

// 옵션 모달 선택 상태
let pendingOptionItem = null;
let selectedOptionTemp = 'ICE';
let selectedOptionSize = 'Regular';
let selectedOptionSizeAdd = 0;
let selectedOptionShot = '기본';
let selectedOptionShotAdd = 0;
let selectedOptionSyrup = '기본';
let selectedOptionSyrupAdd = 0;
let selectedOptionIce = '보통';

document.addEventListener('DOMContentLoaded', () => {
  renderKioskCategories();
  renderKioskMenu();
  renderKioskCart();
  setupKioskEvents();
});

// 1. 카테고리 탭
function renderKioskCategories() {
  const btns = document.querySelectorAll('.kiosk-cat-btn');
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      btns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderKioskMenu();
    });
  });
}

// 카테고리별 필터링 헬퍼 (커피, 디카페인, 티&아이스티, 에이드, 스무디&프라페, 음료(논커피))
function filterKioskMenuItems(category) {
  const allItems = window.cafeStore.getMenuItems();
  if (category === 'all') return allItems;

  if (category === 'coffee') {
    return allItems.filter((i) => i.category === 'coffee');
  }
  if (category === 'decaf') {
    return allItems.filter((i) => i.category === 'decaf' || i.id.startsWith('decaf_'));
  }
  if (category === 'tea') {
    return allItems.filter(
      (i) =>
        i.subCategory === 'tea' &&
        !['strawberry_latte', 'ice_choco', 'matcha_latte', 'brown_sugar_bubble_latte'].includes(i.id)
    );
  }
  if (category === 'ade') {
    return allItems.filter((i) => i.subCategory === 'ade');
  }
  if (category === 'smoothie') {
    return allItems.filter((i) => i.subCategory === 'smoothie' || i.subCategory === 'frappe');
  }
  if (category === 'beverage' || category === 'noncoffee') {
    return allItems.filter((i) =>
      ['strawberry_latte', 'ice_choco', 'matcha_latte', 'brown_sugar_bubble_latte'].includes(i.id)
    );
  }
  return allItems.filter((i) => i.category === category || i.subCategory === category);
}

// 2. 키오스크 메뉴 렌더링
function renderKioskMenu() {
  const grid = document.getElementById('kioskMenuGrid');
  if (!grid) return;

  const filtered = filterKioskMenuItems(currentCategory);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--color-text-sub);">
        <div style="font-size: 32px; margin-bottom: 8px;">🍵</div>
        <p style="font-size: 16px; font-weight: 700;">선택하신 카테고리의 메뉴를 준비 중입니다.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (item) => `
    <div class="kiosk-menu-card" onclick="openOptionModal('${item.id}')">
      <div class="kiosk-drink-img-wrap">
        <img src="${item.image}" alt="${item.name}" class="kiosk-drink-img" loading="lazy">
      </div>
      <div class="kiosk-card-details">
        <div class="kiosk-card-name">${item.name}</div>
        <div class="kiosk-card-price">${item.price.toLocaleString()}원</div>
        <button type="button" class="btn-kiosk-add" onclick="event.stopPropagation(); openOptionModal('${item.id}')">
          + 옵션 선택
        </button>
      </div>
    </div>
  `
    )
    .join('');
}

// 3. 장바구니 렌더링
function renderKioskCart() {
  const container = document.getElementById('kioskCartList');
  const countElem = document.getElementById('kioskTotalCount');
  const priceElem = document.getElementById('kioskTotalPrice');

  const totalCount = kioskCart.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = kioskCart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (countElem) countElem.textContent = `총 ${totalCount}잔`;
  if (priceElem) priceElem.textContent = `${totalPrice.toLocaleString()}원`;

  if (!container) return;

  if (kioskCart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--color-text-sub); font-size: 14px;">
        메뉴를 선택해 주세요.
      </div>
    `;
    return;
  }

  container.innerHTML = kioskCart
    .map((item, idx) => {
      const isIce = item.options?.temperature !== 'HOT';
      const badgeCls = isIce ? 'ice' : 'hot';
      const badgeTxt = isIce ? 'ICE' : 'HOT';
      const optDesc = item.options?.optionText || '';

      return `
      <div class="kiosk-cart-item-card">
        <div class="cart-item-left" style="flex: 1;">
          <img src="${item.image}" alt="${item.name}" class="cart-item-thumb">
          <div style="display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="cart-item-name">${item.name}</span>
              <span class="badge-temp ${badgeCls}">${badgeTxt}</span>
            </div>
            ${optDesc ? `<span class="cart-item-option-desc">${optDesc}</span>` : ''}
          </div>
        </div>
        <div class="cart-item-right">
          <div class="stepper-wrap">
            <button type="button" class="btn-stepper" onclick="changeKioskQty(${idx}, -1)">−</button>
            <span class="stepper-val">${item.quantity}</span>
            <button type="button" class="btn-stepper" onclick="changeKioskQty(${idx}, 1)">+</button>
          </div>
          <span class="cart-item-price">${(item.price * item.quantity).toLocaleString()}원</span>
          <button type="button" class="btn-cart-remove" onclick="removeKioskItem(${idx})" aria-label="삭제">✕</button>
        </div>
      </div>
    `;
    })
    .join('');
}

function changeKioskQty(idx, delta) {
  if (!kioskCart[idx]) return;
  kioskCart[idx].quantity += delta;
  if (kioskCart[idx].quantity <= 0) {
    kioskCart.splice(idx, 1);
  }
  renderKioskCart();
}

function removeKioskItem(idx) {
  kioskCart.splice(idx, 1);
  renderKioskCart();
}

function resetKioskCart() {
  if (kioskCart.length === 0) return;
  if (confirm('장바구니를 비우고 처음으로 돌아가시겠습니까?')) {
    kioskCart = [];
    renderKioskCart();
  }
}

// 4. 옵션 선택 모달
function openOptionModal(menuId) {
  const menu = window.cafeStore.getMenuItemById(menuId);
  if (!menu) return;

  pendingOptionItem = menu;

  // 기본 상태 초기화
  selectedOptionTemp = 'ICE';
  selectedOptionSize = 'Regular';
  selectedOptionSizeAdd = 0;
  selectedOptionShot = '기본';
  selectedOptionShotAdd = 0;
  selectedOptionSyrup = '기본';
  selectedOptionSyrupAdd = 0;
  selectedOptionIce = '보통';

  document.getElementById('optModalMenuName').textContent = menu.name;
  document.getElementById('optModalBasePrice').textContent = `(기본 ${menu.price.toLocaleString()}원)`;
  document.getElementById('optModalThumb').src = menu.image;

  // ICE 전용 음료 체크 (에이드, 콜드브루, 스무디, 아이스티 등)
  const isIceOnly = menu.options?.temperature?.length === 1 && menu.options?.temperature[0] === 'ICE';
  const hotBtn = document.getElementById('btnTempHot');
  const tempNotice = document.getElementById('tempNoticeText');

  if (isIceOnly) {
    if (hotBtn) hotBtn.classList.add('disabled');
    if (tempNotice) tempNotice.style.display = 'block';
  } else {
    if (hotBtn) hotBtn.classList.remove('disabled');
    if (tempNotice) tempNotice.style.display = 'none';
  }

  // 샷 추가 영역: 오직 커피 종류에만 노출!
  const shotSection = document.getElementById('optShotSection');
  const isCoffee = Boolean(menu.isCoffee || menu.category === 'coffee');
  if (shotSection) {
    shotSection.style.display = isCoffee ? 'block' : 'none';
  }

  // 얼음량 영역: ICE일 때만 노출
  const iceSection = document.getElementById('optIceSection');
  if (iceSection) {
    iceSection.style.display = 'block';
  }

  // 버튼 active 상태 리셋
  resetOptionButtonStates();
  updateOptionModalPrice();

  document.getElementById('kioskOptionModal').classList.add('open');
}

function resetOptionButtonStates() {
  // 온도
  document.querySelectorAll('.btn-opt-temp').forEach((b) => {
    b.classList.toggle('selected', b.dataset.temp === selectedOptionTemp);
  });
  // 사이즈
  document.querySelectorAll('.btn-opt-size').forEach((b) => {
    b.classList.toggle('selected', b.dataset.size === selectedOptionSize);
  });
  // 샷
  document.querySelectorAll('.btn-opt-shot').forEach((b) => {
    b.classList.toggle('selected', b.dataset.shot === selectedOptionShot);
  });
  // 시럽
  document.querySelectorAll('.btn-opt-syrup').forEach((b) => {
    b.classList.toggle('selected', b.dataset.syrup === selectedOptionSyrup);
  });
  // 얼음
  document.querySelectorAll('.btn-opt-ice').forEach((b) => {
    b.classList.toggle('selected', b.dataset.ice === selectedOptionIce);
  });
}

function updateOptionModalPrice() {
  if (!pendingOptionItem) return;

  const currentUnitPrice =
    pendingOptionItem.price +
    selectedOptionSizeAdd +
    selectedOptionShotAdd +
    selectedOptionSyrupAdd;

  const priceElem = document.getElementById('optModalPrice');
  if (priceElem) {
    priceElem.textContent = `${currentUnitPrice.toLocaleString()}원`;
  }

  const confirmBtn = document.getElementById('btnConfirmOption');
  if (confirmBtn) {
    confirmBtn.textContent = `장바구니 담기 (${currentUnitPrice.toLocaleString()}원)`;
  }
}

// 옵션 선택 핸들러
function selectTemp(temp) {
  selectedOptionTemp = temp;
  document.querySelectorAll('.btn-opt-temp').forEach((b) => {
    b.classList.toggle('selected', b.dataset.temp === temp);
  });

  // HOT 선택 시 얼음량 옵션 숨김
  const iceSection = document.getElementById('optIceSection');
  if (iceSection) {
    iceSection.style.display = temp === 'HOT' ? 'none' : 'block';
  }

  updateOptionModalPrice();
}

function selectSize(size, addPrice) {
  selectedOptionSize = size;
  selectedOptionSizeAdd = addPrice;
  document.querySelectorAll('.btn-opt-size').forEach((b) => {
    b.classList.toggle('selected', b.dataset.size === size);
  });
  updateOptionModalPrice();
}

function selectShot(shot, addPrice) {
  selectedOptionShot = shot;
  selectedOptionShotAdd = addPrice;
  document.querySelectorAll('.btn-opt-shot').forEach((b) => {
    b.classList.toggle('selected', b.dataset.shot === shot);
  });
  updateOptionModalPrice();
}

function selectSyrup(syrup, addPrice) {
  selectedOptionSyrup = syrup;
  selectedOptionSyrupAdd = addPrice;
  document.querySelectorAll('.btn-opt-syrup').forEach((b) => {
    b.classList.toggle('selected', b.dataset.syrup === syrup);
  });
  updateOptionModalPrice();
}

function selectIce(ice) {
  selectedOptionIce = ice;
  document.querySelectorAll('.btn-opt-ice').forEach((b) => {
    b.classList.toggle('selected', b.dataset.ice === ice);
  });
}

function confirmAddWithOption() {
  if (!pendingOptionItem) return;

  const unitPrice =
    pendingOptionItem.price +
    selectedOptionSizeAdd +
    selectedOptionShotAdd +
    selectedOptionSyrupAdd;

  // 옵션 요약 텍스트 조립
  const parts = [];
  parts.push(selectedOptionSize);
  if (pendingOptionItem.isCoffee && selectedOptionShot !== '기본') {
    parts.push(selectedOptionShot);
  }
  if (selectedOptionSyrup !== '기본') {
    parts.push(selectedOptionSyrup);
  }
  if (selectedOptionTemp === 'ICE' && selectedOptionIce !== '보통') {
    parts.push(`얼음 ${selectedOptionIce}`);
  }
  const optionText = parts.length > 0 ? parts.join(' · ') : `${selectedOptionSize}`;

  // 동일 메뉴 및 동일 옵션 조합 판별
  const existing = kioskCart.find(
    (c) =>
      c.menuId === pendingOptionItem.id &&
      c.options.temperature === selectedOptionTemp &&
      c.options.size === selectedOptionSize &&
      c.options.extraShot === selectedOptionShot &&
      c.options.syrup === selectedOptionSyrup &&
      c.options.iceAmount === selectedOptionIce
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    kioskCart.push({
      menuId: pendingOptionItem.id,
      name: pendingOptionItem.name,
      price: unitPrice,
      basePrice: pendingOptionItem.price,
      quantity: 1,
      image: pendingOptionItem.image,
      options: {
        temperature: selectedOptionTemp,
        size: selectedOptionSize,
        extraShot: selectedOptionShot,
        syrup: selectedOptionSyrup,
        iceAmount: selectedOptionIce,
        optionText: optionText
      }
    });
  }

  document.getElementById('kioskOptionModal').classList.remove('open');
  pendingOptionItem = null;
  renderKioskCart();
}

let isCheckingOut = false;

// 5. 키오스크 주문 접수 및 실시간 Firestore 전송
function checkoutKiosk() {
  if (isCheckingOut) return;

  if (kioskCart.length === 0) {
    alert('선택된 메뉴가 없습니다.\n메뉴를 먼저 선택해 주세요.');
    return;
  }

  isCheckingOut = true;
  const payBtn = document.getElementById('btnKioskPay');
  if (payBtn) payBtn.disabled = true;

  try {
    // 스마트폰 PWA와 100% 동일한 방식으로 Cloud Firestore 실시간 연동 주문 생성
    const order = window.cafeStore.createOrder({
      channel: 'kiosk',
      items: kioskCart,
      userId: 'kiosk_terminal',
      userName: '키오스크 주문'
    });

    // 장바구니 비우기
    kioskCart = [];
    renderKioskCart();

    // 영수증 / 주문완료 모달 오픈
    const modal = document.getElementById('kioskReceiptModal');
    if (modal) {
      const numElem = document.getElementById('receiptOrderNum');
      const totalElem = document.getElementById('receiptTotalAmount');
      const itemsElem = document.getElementById('receiptItemsList');

      if (numElem) numElem.textContent = `#${order.orderNumber}`;
      if (totalElem) totalElem.textContent = `${order.totalAmount.toLocaleString()}원`;

      if (itemsElem) {
        itemsElem.innerHTML = order.items
          .map(
            (it) => `
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
            <div>
              <span style="font-weight:700;">${it.name} (${it.options?.temperature || 'ICE'}) × ${it.quantity}</span>
              <div style="font-size:11px; color:var(--color-text-sub);">${it.options?.optionText || ''}</div>
            </div>
            <span style="font-weight:700;">${((it.price || 0) * it.quantity).toLocaleString()}원</span>
          </div>
        `
          )
          .join('');
      }

      modal.classList.add('open');
    }
  } catch (err) {
    console.error('[Kiosk Checkout Error]:', err);
    alert('주문 처리 중 오류가 발생했습니다: ' + (err.message || err));
  } finally {
    setTimeout(() => {
      isCheckingOut = false;
      if (payBtn) payBtn.disabled = false;
    }, 600);
  }
}
window.checkoutKiosk = checkoutKiosk;

// 6. 이벤트 바인딩
function setupKioskEvents() {
  document.getElementById('btnCloseOptionModal')?.addEventListener('click', () => {
    document.getElementById('kioskOptionModal').classList.remove('open');
    pendingOptionItem = null;
  });

  document.getElementById('btnConfirmOption')?.addEventListener('click', confirmAddWithOption);

  document.getElementById('btnKioskReset')?.addEventListener('click', resetKioskCart);

  // [주문하기] 버튼 (ID 불일치 방지 - btnKioskPay 및 btnKioskCheckout 모두 바인딩)
  document.getElementById('btnKioskPay')?.addEventListener('click', checkoutKiosk);
  document.getElementById('btnKioskCheckout')?.addEventListener('click', checkoutKiosk);

  document.getElementById('btnCloseReceiptModal')?.addEventListener('click', () => {
    document.getElementById('kioskReceiptModal').classList.remove('open');
  });

  // 직원 호출
  document.getElementById('btnCallStaff')?.addEventListener('click', () => {
    window.cafeStore.callStaff();
    document.getElementById('callStaffModal').classList.add('open');
  });

  document.getElementById('btnCloseCallModal')?.addEventListener('click', () => {
    document.getElementById('callStaffModal').classList.remove('open');
  });
}

// 7. 스마트폰 PWA 주문 QR 모달 제어 (Cloud Run HTTPS 기본 제공 + 로컬 Wi-Fi 토글)
const CLOUD_RUN_PWA_URL = 'https://cafecore-app-94943462326.asia-northeast3.run.app/beta/pwa-order.html';
const LOCAL_WIFI_PWA_URL = 'http://192.168.14.188:8080/beta/pwa-order.html';
let kioskQrMode = 'cloud'; // 'cloud' | 'local'

function getKioskPwaUrl() {
  if (kioskQrMode === 'cloud') {
    return CLOUD_RUN_PWA_URL;
  }
  return LOCAL_WIFI_PWA_URL;
}

function toggleKioskQrMode(mode) {
  kioskQrMode = mode;
  const btnCloud = document.getElementById('btnKioskModeCloud');
  const btnLocal = document.getElementById('btnKioskModeLocal');
  if (btnCloud && btnLocal) {
    if (mode === 'cloud') {
      btnCloud.style.background = 'var(--color-primary)';
      btnCloud.style.color = '#fff';
      btnCloud.style.borderColor = 'var(--color-primary)';
      btnLocal.style.background = '#fff';
      btnLocal.style.color = 'var(--color-text-sub)';
      btnLocal.style.borderColor = 'var(--color-border)';
    } else {
      btnLocal.style.background = 'var(--color-primary)';
      btnLocal.style.color = '#fff';
      btnLocal.style.borderColor = 'var(--color-primary)';
      btnCloud.style.background = '#fff';
      btnCloud.style.color = 'var(--color-text-sub)';
      btnCloud.style.borderColor = 'var(--color-border)';
    }
  }
  renderKioskQrCode();
}

function renderKioskQrCode() {
  const targetUrl = getKioskPwaUrl();
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(targetUrl)}`;
  
  const qrImg = document.getElementById('kioskQrImg');
  if (qrImg) qrImg.src = qrApiUrl;

  const targetText = document.getElementById('kioskQrTargetUrlText');
  if (targetText) targetText.textContent = targetUrl;
}

function openKioskQrModal() {
  renderKioskQrCode();
  const modal = document.getElementById('kioskQrModal');
  if (modal) modal.classList.add('open');
}

function closeKioskQrModal() {
  const modal = document.getElementById('kioskQrModal');
  if (modal) modal.classList.remove('open');
}


