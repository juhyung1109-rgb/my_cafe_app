/**
 * CAFE CORE - Store Management & Member Management Logic (store-manage.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  renderMembersDashboard();
  updateFirebaseStatusUI();
  setupFirebaseConfigForm();

  // 사용자 인증 상태 리스너
  window.cafeAuth.onAuthStateChanged((user) => {
    checkAdminPermission(user);
    renderMembersDashboard();
  });
});

/**
 * 1. 관리자 권한 가드 검사
 */
function checkAdminPermission(user) {
  const overlay = document.getElementById('adminGuardOverlay');
  if (!overlay) return;

  if (user && user.role === 'admin') {
    overlay.style.display = 'none';
  } else {
    overlay.style.display = 'flex';
  }
}

/**
 * 2. 회원 대시보드 렌더링 (비동기 처리 지원)
 */
async function renderMembersDashboard() {
  try {
    const todayUsers = await window.cafeAuth.getTodayNewUsers();
    const allUsers = (await window.cafeAuth.getAllUsers()).filter((u) => u.role !== 'admin');

    // 1) 뱃지 및 카운트
    const totalCountElem = document.getElementById('totalUserCount');
    const todayBadge = document.getElementById('badgeTodayUsers');

    if (totalCountElem) totalCountElem.textContent = `${allUsers.length}명`;
    if (todayBadge) todayBadge.textContent = `오늘 가입 ${todayUsers.length}명`;

    // 2) 오늘 신규 가입 회원 테이블 렌더링
    const tbody = document.getElementById('todayMembersTableBody');
    if (!tbody) return;

    if (!todayUsers || todayUsers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 36px 16px; color: var(--color-text-sub);">
            <div style="font-size: 24px; margin-bottom: 6px;">☕</div>
            오늘 새로 가입한 회원이 아직 없습니다.<br>
            <span style="font-size: 12px; color: var(--color-text-muted);">
              우측 상단의 '+ 신규 가입 시뮬레이션' 버튼이나 '회원가입' 모달을 통해 가입을 테스트하실 수 있습니다.
            </span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = todayUsers
      .map((user, idx) => {
        let timeStr = '오늘';
        try {
          timeStr = new Date(user.createdAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        } catch (e) {
          timeStr = user.createdAt || '방금 전';
        }

        const isLive = window.cafeAuth.isLiveFirebase;
        const sourceBadge = isLive
          ? `<span style="display:inline-block; font-size:10px; background:#DCFCE7; color:#15803D; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:4px;">Firestore</span>`
          : `<span style="display:inline-block; font-size:10px; background:#FEF3C7; color:#B45309; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:4px;">Local</span>`;

        return `
        <tr>
          <td style="font-weight: 700; color: var(--color-text-sub);">${idx + 1}</td>
          <td>
            <div style="font-weight: 800; color: var(--color-primary); display: flex; align-items: center;">
              ${escapeHtml(user.name)}
              ${sourceBadge}
            </div>
            <div style="font-size: 11px; color: var(--color-text-muted); font-family: monospace;">${escapeHtml(user.uid)}</div>
          </td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(user.phone || '010-0000-0000')}</td>
          <td style="font-variant-numeric: tabular-nums;">${timeStr}</td>
          <td>
            <span class="badge-auto-verified">
              ✓ 자동 인증 완료
            </span>
          </td>
        </tr>
      `;
      })
      .join('');
  } catch (err) {
    console.error('회원 대시보드 렌더링 실패:', err);
  }
}

/**
 * 3. Firebase 연결 상태 UI 업데이트
 */
function updateFirebaseStatusUI() {
  const statusVal = document.getElementById('firebaseStatusVal');
  const statusDesc = document.getElementById('firebaseStatusDesc');
  if (!statusVal || !statusDesc) return;

  const info = window.cafeAuth.getConnectionInfo();

  if (info.isLiveFirebase) {
    statusVal.textContent = `🟢 실제 Firebase 클라우드 연결됨`;
    statusVal.style.color = '#16A34A';
    statusDesc.innerHTML = `프로젝트: <strong>${escapeHtml(info.projectId)}</strong><br>Firebase Authentication & Cloud Firestore와 실시간 연동 중입니다.`;
  } else if (info.status === 'error') {
    statusVal.textContent = `❌ Firebase 연결 실패`;
    statusVal.style.color = '#DC2626';
    statusDesc.innerHTML = `오류: ${escapeHtml(info.error || '키 또는 네트워크 오류')}<br>브라우저 로컬 스토리지 모드로 안전 전환되었습니다.`;
  } else {
    statusVal.textContent = `⚠️ 미설정 (브라우저 로컬 스토리지 모드)`;
    statusVal.style.color = '#D97706';
    statusDesc.innerHTML = `현재 브라우저 임시 저장소에 저장되고 있습니다.<br>상단의 <strong>[🔥 Firebase 프로젝트 연결 설정]</strong>을 눌러 키를 등록하시면 실제 Firebase에 영구 저장됩니다.`;
  }
}

/**
 * 4. Firebase 설정 모달 제어
 */
function openFirebaseConfigModal() {
  const modal = document.getElementById('firebaseConfigModal');
  if (!modal) return;

  // 현재 설정값 폼에 채우기
  const cfg = window.FIREBASE_CONFIG || {};
  const isCustom = window.isFirebaseConfigured();

  document.getElementById('cfgApiKey').value = isCustom ? (cfg.apiKey || '') : '';
  document.getElementById('cfgProjectId').value = isCustom ? (cfg.projectId || '') : '';
  document.getElementById('cfgAuthDomain').value = isCustom ? (cfg.authDomain || '') : '';
  document.getElementById('cfgStorageBucket').value = isCustom ? (cfg.storageBucket || '') : '';
  document.getElementById('cfgAppId').value = isCustom ? (cfg.appId || '') : '';

  modal.classList.add('open');
}

function closeFirebaseConfigModal() {
  const modal = document.getElementById('firebaseConfigModal');
  if (modal) modal.classList.remove('open');
}

function setupFirebaseConfigForm() {
  const snippetArea = document.getElementById('cfgCodeSnippet');
  const form = document.getElementById('formFirebaseConfig');

  // 스니펫 붙여넣기 시 실시간 자동 파싱
  if (snippetArea) {
    snippetArea.addEventListener('input', () => {
      const text = snippetArea.value.trim();
      if (!text) return;

      const parsed = window.parseFirebaseConfigSnippet(text);
      if (parsed) {
        if (parsed.apiKey) document.getElementById('cfgApiKey').value = parsed.apiKey;
        if (parsed.projectId) document.getElementById('cfgProjectId').value = parsed.projectId;
        if (parsed.authDomain) document.getElementById('cfgAuthDomain').value = parsed.authDomain;
        if (parsed.storageBucket) document.getElementById('cfgStorageBucket').value = parsed.storageBucket;
        if (parsed.appId) document.getElementById('cfgAppId').value = parsed.appId;
      }
    });
  }

  // 폼 제출
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      let apiKey = document.getElementById('cfgApiKey').value.trim();
      let projectId = document.getElementById('cfgProjectId').value.trim();
      let authDomain = document.getElementById('cfgAuthDomain').value.trim();
      let storageBucket = document.getElementById('cfgStorageBucket').value.trim();
      let appId = document.getElementById('cfgAppId').value.trim();

      // 만약 스니펫만 붙여넣고 세부항목이 안 채워졌다면 자동 파싱 시도
      if ((!apiKey || !projectId) && snippetArea && snippetArea.value.trim()) {
        const parsed = window.parseFirebaseConfigSnippet(snippetArea.value.trim());
        if (parsed) {
          apiKey = parsed.apiKey;
          projectId = parsed.projectId;
          authDomain = parsed.authDomain || `${projectId}.firebaseapp.com`;
          storageBucket = parsed.storageBucket || `${projectId}.appspot.com`;
          appId = parsed.appId || '';
        }
      }

      if (!apiKey || !projectId) {
        alert('apiKey와 projectId는 필수 입력 항목입니다.');
        return;
      }

      const newConfig = {
        apiKey,
        authDomain: authDomain || `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: storageBucket || `${projectId}.appspot.com`,
        messagingSenderId: '',
        appId
      };

      if (window.saveFirebaseConfig(newConfig)) {
        alert(`Firebase 설정이 저장되었습니다!\n프로젝트 ID: ${projectId}\n페이지를 새로고침하여 실제 Firebase에 연결합니다.`);
        window.location.reload();
      } else {
        alert('설정 저장 중 오류가 발생했습니다.');
      }
    });
  }
}

function resetToLocalMode() {
  if (confirm('Firebase 클라우드 연동을 해제하고 브라우저 로컬 스토리지 모드로 복구하시겠습니까?')) {
    window.resetFirebaseConfig();
  }
}

function pasteSampleSnippetHelp() {
  const snippetArea = document.getElementById('cfgCodeSnippet');
  if (!snippetArea) return;

  snippetArea.value = `// Firebase 콘솔 웹 앱 설정 예시
const firebaseConfig = {
  apiKey: "AIzaSyD-exampleKey1234567890",
  authDomain: "my-cafe-app.firebaseapp.com",
  projectId: "my-cafe-app",
  storageBucket: "my-cafe-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};`;

  // 입력 트리거
  snippetArea.dispatchEvent(new Event('input'));
}

/**
 * 5. 테스트용 신규 회원 임의 추가 시뮬레이터
 */
async function simulateNewUserRegistration() {
  const names = ['최카푸치노', '정돌체', '강플랫화이트', '윤아인슈페너', '한프라푸치노', '오콜드브루'];
  const rName = names[Math.floor(Math.random() * names.length)];
  const rNum = Math.floor(Math.random() * 9000) + 1000;
  const email = `guest${rNum}@naver.com`;
  const phone = `010-${rNum}-${rNum}`;

  try {
    const u = await window.cafeAuth.signUp(email, 'password1234', rName, phone);
    const dest = window.cafeAuth.isLiveFirebase ? '실제 Firebase (Auth + Cloud Firestore)' : '로컬 스토리지';
    alert(`[신규 가입 완료] '${u.name}'(${u.email}) 가입 완료!\n저장소: ${dest}\n자동 인증되어 오늘 가입 회원 목록에 즉시 추가되었습니다.`);
    await renderMembersDashboard();
  } catch (err) {
    alert(`가입 실패: ${err.message}`);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
