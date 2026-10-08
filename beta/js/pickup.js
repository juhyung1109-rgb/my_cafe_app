/**
 * CAFE CORE - Pick-up Display Board Logic (pickup.js)
 */

let soundEnabled = true;

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  renderPickupBoard();
  setupPickupEvents();

  // 클라우드 주문 즉시 동기화
  if (window.cafeStore && window.cafeStore.syncOrdersFromCloud) {
    window.cafeStore.syncOrdersFromCloud().then(() => renderPickupBoard());
  }

  // 스토어 이벤트 실시간 구독
  window.cafeStore.subscribe((event) => {
    if (event.action === 'ORDER_STATUS_CHANGED') {
      if (event.data?.newStatus === 'ready') {
        playDingDongSound();
      }
      renderPickupBoard();
    } else if (event.action === 'NEW_ORDER' || event.action === 'RESET_DATA') {
      renderPickupBoard();
    }
  });
});

// 1. 디지털 시계 갱신
function initClock() {
  const clockElem = document.getElementById('didClockDisplay');
  function update() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    if (clockElem) {
      clockElem.textContent = `${hours}:${minutes}`;
    }
  }
  update();
  setInterval(update, 1000);
}

// 2. 상황판 화면 렌더링
function renderPickupBoard() {
  const cookingGrid = document.getElementById('didCookingGrid');
  const readyGrid = document.getElementById('didReadyGrid');
  if (!cookingGrid || !readyGrid) return;

  const orders = window.cafeStore.getOrders();

  // 1) 제조 중 주문 (cooking)
  const cookingOrders = orders.filter((o) => o.status === 'cooking');
  cookingOrders.sort((a, b) => a.orderNumber - b.orderNumber);

  if (cookingOrders.length === 0) {
    cookingGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-sub); font-size: 18px; font-weight: 600;">
        현재 제조 중인 음료가 없습니다.
      </div>
    `;
  } else {
    cookingGrid.innerHTML = cookingOrders
      .map(
        (o) => `
      <div class="num-tile-cooking" id="cooking-${o.orderNumber}">
        ${o.orderNumber}
      </div>
    `
      )
      .join('');
  }

  // 2) 픽업 가능 주문 (ready)
  const readyOrders = orders.filter((o) => o.status === 'ready');
  // 최근 주문 번호 순 또는 순서대로
  readyOrders.sort((a, b) => a.orderNumber - b.orderNumber);

  if (readyOrders.length === 0) {
    readyGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: rgba(255,255,255,0.7); font-size: 20px; font-weight: 600;">
        픽업 준비 중입니다.
      </div>
    `;
  } else {
    // 가장 최근에 ready된 주문 찾기
    const recentOrder = readyOrders.find((o) => o.isRecentReady) || readyOrders[readyOrders.length - 1];

    readyGrid.innerHTML = readyOrders
      .map((o) => {
        const isRecent = o.id === recentOrder?.id;
        return `
        <div class="card-ready-num ${isRecent ? 'recent-highlight' : ''}" id="ready-${o.orderNumber}">
          ${isRecent ? `<div class="sparkle-icon">✦</div>` : ''}
          ${o.orderNumber}
          ${isRecent ? `<span class="badge-recent-ready">방금 완료</span>` : ''}
        </div>
      `;
      })
      .join('');
  }
}

// 3. Web Audio API를 활용한 카페 차임벨 사운드 (딩-동♪)
function playDingDongSound() {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // '딩' 소리 (고음 880Hz / A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.8);

    // '동' 소리 (중음 659Hz / E5) - 0.25초 뒤
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.25);
    gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.25);
    osc2.stop(ctx.currentTime + 1.2);
  } catch (err) {
    console.warn('Audio playback not allowed or failed:', err);
  }
}

// 4. 이벤트 핸들러
function setupPickupEvents() {
  const soundBtn = document.getElementById('btnSoundToggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundBtn.textContent = soundEnabled ? '🔔 알림음 켜짐' : '🔕 알림음 꺼짐';
      if (soundEnabled) playDingDongSound();
    });
  }

  const fsBtn = document.getElementById('btnFullscreenToggle');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }
}
