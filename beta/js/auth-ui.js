/**
 * CAFE CORE - 공통 인증 UI & 글로벌 헤더 제어 (auth-ui.js)
 * 모든 페이지에서 로그인 상태, 관리자 전용 메뉴(매장 관리) 노출, 로그인/회원가입 모달을 일관되게 제어합니다.
 */

document.addEventListener('DOMContentLoaded', () => {
  injectAuthModalDOM();
  setupAuthListeners();
  updateHeaderAuthState(null); // 초기 상태: admin이 아닌 일반 이용자에게는 '주문하기'만 노출
});

// 1. 공통 로그인/회원가입 모달 DOM 동적 주입
function injectAuthModalDOM() {
  if (document.getElementById('globalAuthModal')) return;

  const modalHtml = `
  <div class="modal-overlay" id="globalAuthModal">
    <div class="modal-content" style="max-width: 440px;">
      <button type="button" class="modal-close-btn" id="btnCloseAuthModal" aria-label="닫기">✕</button>
      
      <!-- 탭 스위처: 로그인 vs 회원가입 -->
      <div style="display:flex; gap:10px; border-bottom: 2px solid var(--color-border); margin-bottom: 20px;">
        <button type="button" id="tabLogin" class="auth-tab-btn active" style="flex:1; padding: 10px; background:none; border:none; font-size:16px; font-weight:800; cursor:pointer; color:var(--color-primary); border-bottom: 2px solid var(--color-primary); margin-bottom: -2px;">
          로그인
        </button>
        <button type="button" id="tabSignUp" class="auth-tab-btn" style="flex:1; padding: 10px; background:none; border:none; font-size:16px; font-weight:700; cursor:pointer; color:var(--color-text-sub);">
          회원가입 (자동인증)
        </button>
      </div>

      <!-- 1) 로그인 폼 -->
      <form id="formLogin" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="font-size: 13px; font-weight: 700; color: var(--color-text-main); display: block; margin-bottom: 5px;">이메일</label>
          <input type="email" id="loginEmail" required placeholder="예: admin@gmail.com" class="auth-input">
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 700; color: var(--color-text-main); display: block; margin-bottom: 5px;">비밀번호</label>
          <input type="password" id="loginPassword" required placeholder="비밀번호 입력" class="auth-input">
        </div>
        
        <div id="loginErrorMsg" style="color: #DC2626; font-size: 13px; font-weight: 600; display: none;"></div>

        <button type="submit" class="btn-auth-submit">
          로그인
        </button>

        <!-- 원클릭 테스트 바로가기 버튼 -->
        <div style="background: #F3F1EB; border-radius: 8px; padding: 12px; margin-top: 6px; font-size: 12px; color: var(--color-text-sub);">
          <div style="font-weight: 700; margin-bottom: 6px; color: var(--color-text-main);">⚡ 빠른 계정 테스트:</div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-fast-fill" onclick="fillFastLogin('admin@gmail.com', 'password1234')">
              👑 관리자 계정 채우기
            </button>
            <button type="button" class="btn-fast-fill" onclick="fillFastLogin('kim.coffee@naver.com', 'password1234')">
              ☕ 일반 회원 채우기
            </button>
          </div>
        </div>
      </form>

      <!-- 2) 회원가입 폼 (자동 인증) -->
      <form id="formSignUp" style="display: none; flex-direction: column; gap: 12px;">
        <div>
          <label style="font-size: 13px; font-weight: 700; color: var(--color-text-main); display: block; margin-bottom: 4px;">이름</label>
          <input type="text" id="signUpName" required placeholder="이름 입력 (예: 홍길동)" class="auth-input">
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 700; color: var(--color-text-main); display: block; margin-bottom: 4px;">이메일</label>
          <input type="email" id="signUpEmail" required placeholder="이메일 주소 입력" class="auth-input">
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 700; color: var(--color-text-main); display: block; margin-bottom: 4px;">휴대폰 번호</label>
          <input type="tel" id="signUpPhone" placeholder="010-1234-5678" class="auth-input">
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 700; color: var(--color-text-main); display: block; margin-bottom: 4px;">비밀번호 (6자 이상)</label>
          <input type="password" id="signUpPassword" required minlength="6" placeholder="비밀번호" class="auth-input">
        </div>

        <div style="background: #E8F5E9; color: #1B5E20; padding: 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">
          ✨ <strong>안내:</strong> 회원가입 즉시 별도의 대기 없이 <strong>자동 인증</strong>되어 바로 서비스를 이용하실 수 있습니다.
        </div>

        <div id="signUpErrorMsg" style="color: #DC2626; font-size: 13px; font-weight: 600; display: none;"></div>

        <button type="submit" class="btn-auth-submit">
          회원가입 완료 (자동 인증)
        </button>
      </form>

    </div>
  </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  attachModalEvents();
}

// 2. 모달 이벤트 바인딩
function attachModalEvents() {
  const modal = document.getElementById('globalAuthModal');
  const closeBtn = document.getElementById('btnCloseAuthModal');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignUp = document.getElementById('tabSignUp');
  const formLogin = document.getElementById('formLogin');
  const formSignUp = document.getElementById('formSignUp');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }

  if (tabLogin && tabSignUp) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabLogin.style.color = 'var(--color-primary)';
      tabLogin.style.borderBottom = '2px solid var(--color-primary)';
      tabSignUp.classList.remove('active');
      tabSignUp.style.color = 'var(--color-text-sub)';
      tabSignUp.style.borderBottom = 'none';
      formLogin.style.display = 'flex';
      formSignUp.style.display = 'none';
    });

    tabSignUp.addEventListener('click', () => {
      tabSignUp.classList.add('active');
      tabSignUp.style.color = 'var(--color-primary)';
      tabSignUp.style.borderBottom = '2px solid var(--color-primary)';
      tabLogin.classList.remove('active');
      tabLogin.style.color = 'var(--color-text-sub)';
      tabLogin.style.borderBottom = 'none';
      formLogin.style.display = 'none';
      formSignUp.style.display = 'flex';
    });
  }

  // 로그인 폼 제출
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errElem = document.getElementById('loginErrorMsg');
      errElem.style.display = 'none';

      const email = document.getElementById('loginEmail').value;
      const pw = document.getElementById('loginPassword').value;

      try {
        const user = await window.cafeAuth.signIn(email, pw);
        modal.classList.remove('open');
        alert(`${user.name}님 환영합니다! (${user.role === 'admin' ? '관리자 권한 부여' : '일반 회원'})`);
      } catch (err) {
        errElem.textContent = err.message;
        errElem.style.display = 'block';
      }
    });
  }

  // 회원가입 폼 제출
  if (formSignUp) {
    formSignUp.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errElem = document.getElementById('signUpErrorMsg');
      errElem.style.display = 'none';

      const name = document.getElementById('signUpName').value;
      const email = document.getElementById('signUpEmail').value;
      const phone = document.getElementById('signUpPhone').value;
      const pw = document.getElementById('signUpPassword').value;

      try {
        const user = await window.cafeAuth.signUp(email, pw, name, phone);
        modal.classList.remove('open');
        alert(`🎉 축하합니다! ${user.name}님의 회원가입이 완료되었습니다.\n자동 인증 처리되어 즉시 로그인되었습니다.`);
      } catch (err) {
        errElem.textContent = err.message;
        errElem.style.display = 'block';
      }
    });
  }
}

function fillFastLogin(email, pw) {
  const emailInput = document.getElementById('loginEmail');
  const pwInput = document.getElementById('loginPassword');
  if (emailInput) emailInput.value = email;
  if (pwInput) pwInput.value = pw;
}

// 3. 글로벌 헤더 로그인 상태 & [매장 관리] 탭 노출 제어
function setupAuthListeners() {
  window.cafeAuth.onAuthStateChanged((user) => {
    updateHeaderAuthState(user);
    handleAdminOnlyAccess(user);
  });
}

function updateHeaderAuthState(user) {
  const isAdmin = Boolean(user && user.role === 'admin');

  // body에 is-admin 클래스 토글 (CSS 레벨에서 admin 전용 탭/카드 제어)
  if (document.body) {
    document.body.classList.toggle('is-admin', isAdmin);
  }

  // 1) 헤더 내 운영자 전용 탭 제어: admin이 아닌 일반 이용자(손님)는 오직 [주문하기]만 표시!
  const navItems = document.querySelectorAll('.nav-links .nav-link-item');
  navItems.forEach((item) => {
    const text = (item.textContent || '').trim();
    if (text.includes('주문하기')) {
      item.style.setProperty('display', 'inline-block', 'important');
    } else {
      // 주방, 주문 현황판, 매출, 키오스크, 매장 관리는 오직 admin일 때만 노출!
      if (isAdmin) {
        item.style.setProperty('display', 'inline-block', 'important');
      } else {
        item.style.setProperty('display', 'none', 'important');
      }
    }
  });

  // 포털 index.html 내의 매장 관리 버튼 제어
  const portalStoreManageBtn = document.getElementById('portalTabStoreManage');
  if (portalStoreManageBtn) {
    portalStoreManageBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  }

  // 2) 헤더 우측 로그인/사용자 정보 영역
  const roleBadges = document.querySelectorAll('.role-badge');
  const headerRightWrappers = document.querySelectorAll('.header-right-meta, .mobile-header-actions');

  headerRightWrappers.forEach((wrapper) => {
    // 기존 동적 auth 버튼들 제거
    const oldAuth = wrapper.querySelector('.auth-status-chip');
    if (oldAuth) oldAuth.remove();

    const isMobileHeader = wrapper.classList.contains('mobile-header-actions');
    const authChip = document.createElement('div');
    authChip.className = 'auth-status-chip';
    authChip.style.display = 'inline-flex';
    authChip.style.alignItems = 'center';
    authChip.style.gap = isMobileHeader ? '6px' : '8px';

    if (user) {
      const isAdm = user.role === 'admin';
      authChip.innerHTML = `
        <span style="font-size: ${isMobileHeader ? '12px' : '13px'}; font-weight: 700; color: var(--color-primary); white-space: nowrap;">
          ${isAdm ? '👑' : '☕'} ${user.name}님
        </span>
        <button type="button" class="btn-header-action" onclick="window.cafeAuth.signOut()" style="padding: 4px 8px; font-size: 11px;">
          로그아웃
        </button>
      `;
    } else {
      authChip.innerHTML = `
        <button type="button" class="btn-header-action" onclick="openAuthModal()" style="background: var(--color-primary); color: white; border: none; font-weight: 700; padding: ${isMobileHeader ? '5px 10px' : '6px 14px'}; font-size: ${isMobileHeader ? '12px' : '13px'}; border-radius: var(--radius-sm); white-space: nowrap;">
          로그인
        </button>
      `;
    }

    const cartBtn = wrapper.querySelector('#headerCartBtn');
    if (cartBtn) {
      wrapper.insertBefore(authChip, cartBtn);
    } else {
      wrapper.prepend(authChip);
    }
  });

  // 역할 뱃지 문구 업데이트
  if (user) {
    roleBadges.forEach((b) => {
      b.textContent = user.role === 'admin' ? '관리자 (admin)' : `회원 (${user.name})`;
    });
  }
}

// 4. 매장 관리 페이지 접근 제어 (관리자 외 접근 차단)
function handleAdminOnlyAccess(user) {
  const isStoreManagePage = window.location.pathname.includes('store-manage.html');
  if (isStoreManagePage) {
    const isAdmin = user && user.role === 'admin';
    const guardOverlay = document.getElementById('adminGuardOverlay');
    if (guardOverlay) {
      guardOverlay.style.display = isAdmin ? 'none' : 'flex';
    }
  }
}

function openAuthModal() {
  const modal = document.getElementById('globalAuthModal');
  if (modal) modal.classList.add('open');
}

window.openAuthModal = openAuthModal;
window.fillFastLogin = fillFastLogin;
