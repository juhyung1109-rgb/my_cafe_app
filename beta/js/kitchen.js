/**
 * CAFE CORE - Kitchen Display System Logic (kitchen.js)
 */

let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  renderKdsOrders();
  setupKdsEvents();

  // 클라우드 주문 즉시 동기화 (스마트폰 주문 즉시 로드)
  if (window.cafeStore && window.cafeStore.syncOrdersFromCloud) {
    window.cafeStore.syncOrdersFromCloud().then(() => renderKdsOrders());
  }

  // 1초마다 경과 시간 실시간 계산 및 갱신
  timerInterval = setInterval(updateElapsedTimes, 1000);

  // 실시간 스토어 이벤트 구독
  window.cafeStore.subscribe((event) => {
    if (event.action === 'CALL_STAFF') {
      handleStaffCallAlert(event.data);
    }
    // 주문 추가 또는 상태 변경 시 주방 화면 즉시 재렌더링
    renderKdsOrders();
  });
});

// 주방 화면 렌더링
function renderKdsOrders() {
  const container = document.getElementById('kdsOrderGrid');
  const countElem = document.getElementById('kdsActiveCount');
  if (!container) return;

  const orders = window.cafeStore.getOrders();
  // 주방에서 봐야 하는 주문: 아직 완료되지 않은 'received' (접수) 및 'cooking' (제조 중)
  const activeOrders = orders.filter((o) => o.status === 'received' || o.status === 'cooking');

  // 먼저 접수한 주문부터 정렬 (오래된 순)
  activeOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (countElem) {
    countElem.textContent = `진행 중 ${activeOrders.length}건`;
  }

  if (activeOrders.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px; background: white; border-radius: 14px; border: 1px dashed var(--color-border);">
        <div style="font-size: 40px; margin-bottom: 10px;">☕</div>
        <h3 style="font-size: 18px; font-weight: 800; color: var(--color-primary);">현재 대기 중인 주문이 없습니다.</h3>
        <p style="font-size: 13px; color: var(--color-text-sub); margin-top: 6px;">
          스마트폰 PWA 또는 키오스크에서 새 주문이 들어오면 실시간으로 여기에 표시됩니다.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeOrders
    .map((order) => {
      const isCooking = order.status === 'cooking';
      const badgeCls = isCooking ? 'badge-cooking' : 'badge-received';
      const badgeTxt = isCooking ? '제조 중' : '주문 접수';

      // 경과 시간 계산
      const elapsedStr = getElapsedText(order.createdAt);

      // 모든 메뉴가 체크되었는지 확인
      const allChecked = order.items.every((it) => it.checked);

      return `
      <div class="kds-card ${isCooking ? 'cooking' : ''}" id="kds-card-${order.id}">
        <div class="kds-card-header">
          <div class="kds-card-header-left">
            <span class="kds-order-num">#${order.orderNumber}</span>
            <span class="kds-badge ${badgeCls}">${badgeTxt}</span>
          </div>
          <span class="kds-elapsed-time" data-created="${order.createdAt}">${elapsedStr}</span>
        </div>

        <div class="kds-items-list">
          ${order.items
            .map((item, idx) => {
              const optionsStr = formatOptions(item.options);
              return `
              <div class="kds-item-row ${item.checked ? 'checked' : ''}" onclick="toggleItemCheck('${order.id}', ${idx})">
                <div class="kds-checkbox ${item.checked ? 'checked' : ''}">
                  ${item.checked ? '✓' : ''}
                </div>
                <img src="${item.image}" alt="${item.name}" class="kds-item-thumb">
                <div class="kds-item-info">
                  <div class="kds-item-title">${item.name} × ${item.quantity}</div>
                  <div class="kds-item-options">${optionsStr}</div>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>

        ${
          !isCooking
            ? `
          <button type="button" class="btn-kds-action btn-start-cook" onclick="startCooking('${order.id}')">
            제조 시작
          </button>
        `
            : `
          <button type="button" class="btn-kds-action btn-ready-pickup ${allChecked ? '' : 'disabled'}" onclick="finishOrder('${order.id}', ${allChecked})">
            픽업 준비 완료
          </button>
        `
        }
      </div>
    `;
    })
    .join('');
}

// 옵션 텍스트 포맷 (예: ICE · Large · +1샷 · 얼음 적게)
function formatOptions(opts) {
  if (!opts) return '기본';
  if (opts.optionText) {
    const tempPrefix = opts.temperature ? `${opts.temperature} · ` : '';
    return `${tempPrefix}${opts.optionText}`;
  }
  const parts = [];
  if (opts.temperature) parts.push(opts.temperature);
  if (opts.size && opts.size !== 'Regular') parts.push(opts.size);
  if (opts.extraShot && opts.extraShot !== '기본') parts.push(`샷: ${opts.extraShot}`);
  if (opts.syrup && opts.syrup !== '기본') parts.push(opts.syrup);
  if (opts.iceAmount && opts.iceAmount !== '보통') parts.push(`얼음 ${opts.iceAmount}`);
  if (opts.decaf) parts.push('디카페인');
  return parts.length > 0 ? parts.join(' · ') : (opts.temperature || '기본');
}

// 경과 시간 텍스트 계산
function getElapsedText(createdAt) {
  const diffSec = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  const min = Math.floor(diffSec / 60);
  return `접수 후 ${min}분`;
}

function updateElapsedTimes() {
  document.querySelectorAll('.kds-elapsed-time').forEach((el) => {
    const created = el.dataset.created;
    if (created) {
      el.textContent = getElapsedText(created);
    }
  });
}

// 개별 메뉴 체크 토글
function toggleItemCheck(orderId, itemIndex) {
  window.cafeStore.toggleItemKitchenCheck(orderId, itemIndex);
}

// 제조 시작
function startCooking(orderId) {
  window.cafeStore.updateOrderStatus(orderId, 'cooking');
}

// 픽업 준비 완료
function finishOrder(orderId, allChecked) {
  if (!allChecked) {
    if (!confirm('아직 제조 완료 체크가 되지 않은 메뉴가 있습니다. 픽업 준비를 완료하시겠습니까?')) {
      return;
    }
  }
  window.cafeStore.updateOrderStatus(orderId, 'ready');
}

// 직원 호출 알림 처리
function handleStaffCallAlert(data) {
  alert(`🔔 [직원 호출] ${data.message || '키오스크에서 직원을 호출했습니다.'} (${data.timestamp || ''})`);
}

function setupKdsEvents() {
  const btnSample = document.getElementById('btnResetSample');
  if (btnSample) {
    btnSample.textContent = '주문 비우기 (초기화)';
    btnSample.addEventListener('click', () => {
      if (confirm('주방 및 모든 화면의 주문 데이터를 0건으로 완전 초기화하시겠습니까?')) {
        window.cafeStore.clearAllOrders();
      }
    });
  }
}
