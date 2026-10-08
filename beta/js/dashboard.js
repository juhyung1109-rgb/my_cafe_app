/**
 * CAFE CORE - Sales Dashboard Logic (dashboard.js)
 */

let selectedChannel = 'all';

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  setupDashboardEvents();

  // 클라우드 주문 즉시 동기화
  if (window.cafeStore && window.cafeStore.syncOrdersFromCloud) {
    window.cafeStore.syncOrdersFromCloud().then(() => renderDashboard());
  }

  // 실시간 주문 및 상태 변경 시 대시보드 자동 갱신
  window.cafeStore.subscribe((event) => {
    if (event.action === 'NEW_ORDER' || event.action === 'ORDER_STATUS_CHANGED' || event.action === 'RESET_DATA') {
      renderDashboard();
    }
  });
});

function renderDashboard() {
  const summary = window.cafeStore.getSalesSummary();

  // 1. KPI 4종 카드 업데이트
  const payElem = document.getElementById('kpiPayment');
  const netElem = document.getElementById('kpiNetSales');
  const refundElem = document.getElementById('kpiRefund');
  const ordersElem = document.getElementById('kpiOrders');

  if (payElem) payElem.textContent = `${summary.totalPayment.toLocaleString()}원`;
  if (netElem) netElem.textContent = `${summary.netSales.toLocaleString()}원`;
  if (refundElem) refundElem.textContent = `${summary.refundAmount.toLocaleString()}원`;
  if (ordersElem) ordersElem.textContent = `${summary.totalOrderCount}건 / ${summary.totalCups}잔`;

  // 2. 음료별 순매출 가로 바 차트
  renderMenuSalesChart(summary.menuSales);

  // 3. 시간대별 결제 금액 세로 바 차트
  renderHourlyChart(summary.hourlySales);

  // 4. 주문 채널별 비중
  renderChannelBreakdown(summary.channelBreakdown);
}

function renderMenuSalesChart(menuSales) {
  const container = document.getElementById('menuSalesBars');
  if (!container) return;

  const items = [
    { name: '아메리카노', img: './assets/images/americano.png', val: menuSales.americano },
    { name: '카페 라떼', img: './assets/images/cafe_latte.png', val: menuSales.cafe_latte },
    { name: '바닐라 라떼', img: './assets/images/vanilla_latte.png', val: menuSales.vanilla_latte },
    { name: '말차 라떼', img: './assets/images/matcha_latte.png', val: menuSales.matcha_latte },
    { name: '기타 메뉴', img: './assets/images/coldbrew.png', val: menuSales.other }
  ];

  const maxVal = Math.max(...items.map((i) => i.val), 0);

  container.innerHTML = items
    .map((item) => {
      const pct = maxVal > 0 && item.val > 0 ? Math.round((item.val / maxVal) * 100) : 0;
      return `
      <div class="bar-row">
        <img src="${item.img}" alt="${item.name}" class="bar-row-thumb">
        <span class="bar-row-label">${item.name}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%;"></div>
        </div>
        <span class="bar-row-val">${item.val.toLocaleString()}원</span>
      </div>
    `;
    })
    .join('');
}

function renderHourlyChart(hourlySales) {
  const container = document.getElementById('hourlyBarsChart');
  if (!container) return;

  const hours = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
  const maxVal = Math.max(...Object.values(hourlySales), 0);

  container.innerHTML = hours
    .map((h) => {
      const val = hourlySales[h] || 0;
      const heightPct = maxVal > 0 && val > 0 ? Math.max(Math.round((val / maxVal) * 100), 12) : 0;
      const isPeak = val > 0 && val === maxVal;

      return `
      <div class="v-bar-col ${isPeak ? 'peak' : ''}" title="${h}시: ${val.toLocaleString()}원">
        <div class="v-bar-fill" style="height: ${heightPct}%;"></div>
        <span class="v-bar-hour-label">${h}</span>
      </div>
    `;
    })
    .join('');
}

function renderChannelBreakdown(breakdown) {
  const fillElem = document.getElementById('channelFillPwa');
  const pwaStatElem = document.getElementById('channelStatPwa');
  const kioskStatElem = document.getElementById('channelStatKiosk');

  if (fillElem) fillElem.style.width = `${breakdown.pwaPercent}%`;
  if (pwaStatElem) pwaStatElem.textContent = `${breakdown.pwaCount}건 · ${breakdown.pwaPercent}%`;
  if (kioskStatElem) kioskStatElem.textContent = `${breakdown.kioskCount}건 · ${breakdown.kioskPercent}%`;
}

// CSV 다운로드 기능
function downloadSalesCSV() {
  const summary = window.cafeStore.getSalesSummary();
  const rows = [
    ['날짜', '총 결제금액', '순매출', '환불금액', '총 주문건수', '총 판매잔수'],
    [summary.date, summary.totalPayment, summary.netSales, summary.refundAmount, summary.totalOrderCount, summary.totalCups],
    [],
    ['음료명', '매출금액'],
    ['아메리카노', summary.menuSales.americano],
    ['카페 라떼', summary.menuSales.cafe_latte],
    ['바닐라 라떼', summary.menuSales.vanilla_latte],
    ['말차 라떼', summary.menuSales.matcha_latte],
    ['기타 메뉴', summary.menuSales.other],
    [],
    ['주문 채널', '주문건수', '비중'],
    ['스마트폰 PWA', summary.channelBreakdown.pwaCount, `${summary.channelBreakdown.pwaPercent}%`],
    ['키오스크', summary.channelBreakdown.kioskCount, `${summary.channelBreakdown.kioskPercent}%`]
  ];

  let csvContent = '\uFEFF'; // UTF-8 BOM
  rows.forEach((row) => {
    csvContent += row.join(',') + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `CAFE_CORE_매출보고서_${summary.date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function setupDashboardEvents() {
  const btnCsv = document.getElementById('btnDownloadCsv');
  if (btnCsv) btnCsv.addEventListener('click', downloadSalesCSV);

  const selChannel = document.getElementById('selChannel');
  if (selChannel) {
    selChannel.addEventListener('change', (e) => {
      selectedChannel = e.target.value;
      renderDashboard();
    });
  }
}
