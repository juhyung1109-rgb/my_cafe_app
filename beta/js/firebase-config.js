/**
 * CAFE CORE - Firebase 프로젝트 환경 설정 (firebase-config.js)
 * 
 * 구글 Cloud Firestore & Authentication 공식 연동 설정
 * Project: iceu-songpa03
 * App: cafeapp
 */

// 실제 등록된 iceu-songpa03 전용 Firebase Cloud 설정
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDyjdSJIzfBFYIZeoLV_L4ICWNBUeDT6cU",
  authDomain: "iceu-songpa03.firebaseapp.com",
  projectId: "iceu-songpa03",
  storageBucket: "iceu-songpa03.firebasestorage.app",
  messagingSenderId: "94943462326",
  appId: "1:94943462326:web:b6b604f9fb224670243717",
  measurementId: "G-S4RR2X1NSZ"
};

// 로컬 스토리지에 새로 발급된 iceu-songpa03 설정 동기화
try {
  localStorage.setItem('cafecore_firebase_config_v1', JSON.stringify(DEFAULT_FIREBASE_CONFIG));
} catch (e) {}

window.FIREBASE_CONFIG = DEFAULT_FIREBASE_CONFIG;

// 설정이 실제 유효한지 검사하는 헬퍼
window.isFirebaseConfigured = function() {
  const cfg = window.FIREBASE_CONFIG;
  return !!(
    cfg &&
    cfg.apiKey &&
    cfg.apiKey !== "YOUR_API_KEY" &&
    !cfg.apiKey.includes("YOUR_") &&
    cfg.projectId &&
    cfg.projectId !== "your-project-id" &&
    !cfg.projectId.includes("your-project")
  );
};

// 화면에서 사용자가 키 객체를 직접 저장/변경할 수 있는 헬퍼
window.saveFirebaseConfig = function(newConfig) {
  try {
    localStorage.setItem('cafecore_firebase_config_v1', JSON.stringify(newConfig));
    window.FIREBASE_CONFIG = newConfig;
    return true;
  } catch (err) {
    console.error('Firebase 설정 저장 실패:', err);
    return false;
  }
};

// 사용자가 복사한 JS/JSON 코드 스니펫에서 firebaseConfig를 자동 추출하는 파서
window.parseFirebaseConfigSnippet = function(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  try {
    const parsed = JSON.parse(rawText.trim());
    if (parsed.apiKey && parsed.projectId) {
      return parsed;
    }
  } catch (e) {}

  try {
    const apiKeyMatch = rawText.match(/apiKey\s*:\s*["']([^"']+)["']/);
    const authDomainMatch = rawText.match(/authDomain\s*:\s*["']([^"']+)["']/);
    const projectIdMatch = rawText.match(/projectId\s*:\s*["']([^"']+)["']/);
    const storageBucketMatch = rawText.match(/storageBucket\s*:\s*["']([^"']+)["']/);
    const messagingSenderIdMatch = rawText.match(/messagingSenderId\s*:\s*["']([^"']+)["']/);
    const appIdMatch = rawText.match(/appId\s*:\s*["']([^"']+)["']/);

    if (apiKeyMatch && projectIdMatch) {
      return {
        apiKey: apiKeyMatch[1],
        authDomain: authDomainMatch ? authDomainMatch[1] : `${projectIdMatch[1]}.firebaseapp.com`,
        projectId: projectIdMatch[1],
        storageBucket: storageBucketMatch ? storageBucketMatch[1] : `${projectIdMatch[1]}.appspot.com`,
        messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1] : '',
        appId: appIdMatch ? appIdMatch[1] : ''
      };
    }
  } catch (e) {
    console.warn('코드 스니펫 파싱 오류:', e);
  }

  return null;
};

// 설정 초기화
window.resetFirebaseConfig = function() {
  localStorage.removeItem('cafecore_firebase_config_v1');
  window.location.reload();
};
