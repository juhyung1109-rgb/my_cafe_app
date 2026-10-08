/**
 * CAFE CORE - Firebase 실제 연동 인증 & Firestore 회원 관리 모듈 (firebase-auth.js)
 * 
 * - Firebase SDK v10 (Compat) 기반
 * - Firebase Authentication: 사용자 가입/로그인/로그아웃
 * - Cloud Firestore: 'users' 컬렉션에 회원 정보(이름, 이메일, 전화번호, role, isVerified: true, createdAt) 영구 저장
 * - 관리자 계정: admin@gmail.com / password1234
 * - Firebase 미설정 시: 안내 팝업과 함께 브라우저 로컬 스토리지 모드로 안전 폴백
 */

const LOCAL_STORAGE_KEYS = {
  USERS: 'cafecore_users_v1',
  CURRENT_USER: 'cafecore_current_user_v1'
};

class FirebaseAuthService {
  constructor() {
    this.authListeners = new Set();
    this.isLiveFirebase = false;
    this.connectionStatus = 'unconfigured'; // 'connected' | 'unconfigured' | 'error'
    this.connectionError = null;
    this.auth = null;
    this.db = null;

    this.initFirebase();
  }

  // 1. Firebase 초기화 시도
  initFirebase() {
    const hasConfig = typeof window.isFirebaseConfigured === 'function' && window.isFirebaseConfigured();

    if (typeof firebase !== 'undefined' && hasConfig) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        this.auth = firebase.auth();

        // 사용자 지정 데이터베이스(ai-studio-classictetris-db...) 또는 기본 데이터베이스 연결
        if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.databaseId) {
          try {
            this.db = firebase.app().firestore(window.FIREBASE_CONFIG.databaseId);
            console.log('✅ [Firestore] Named Database 연결 성공:', window.FIREBASE_CONFIG.databaseId);
          } catch (dbErr) {
            console.warn('[Firestore] Named database 호출 실패 -> 기본 firestore() 사용:', dbErr);
            this.db = firebase.firestore();
          }
        } else {
          this.db = firebase.firestore();
        }

        this.isLiveFirebase = true;
        this.connectionStatus = 'connected';
        this.connectionError = null;

        console.log('✅ [Firebase] 실제 Cloud Firebase에 성공적으로 연결되었습니다! (Project ID:', window.FIREBASE_CONFIG.projectId, ')');

        // Firebase Auth 상태 변화 실시간 리스너
        this.auth.onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            const profile = await this.getUserProfileFromFirestore(firebaseUser.uid);
            const user = profile || {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || (firebaseUser.email === 'admin@gmail.com' ? '총괄 관리자' : '회원'),
              role: firebaseUser.email === 'admin@gmail.com' ? 'admin' : 'user',
              isVerified: true,
              createdAt: new Date().toISOString()
            };
            this.setCurrentUser(user, false);
          } else {
            // 로컬에 저장된 사용자 세션 확인 (Auth 토큰 만료 또는 초기 로드)
            const cachedUser = this.getCurrentUser();
            if (!cachedUser) {
              this.setCurrentUser(null, false);
            }
          }
        });

        // 관리자 계정 보장
        this.ensureAdminUserExists();
      } catch (err) {
        console.warn('⚠️ [Firebase] 초기화 중 오류 발생 (로컬 모드로 폴백):', err);
        this.isLiveFirebase = false;
        this.connectionStatus = 'error';
        this.connectionError = err.message || 'Firebase 초기화 실패';
        this.initLocalFallback();
      }
    } else {
      console.log('ℹ️ [Firebase] 프로젝트 키 미설정 상태 -> 브라우저 로컬 스토리지 모드로 동작합니다. (매장 관리 페이지에서 Firebase 키를 등록하시면 즉시 클라우드로 연결됩니다)');
      this.isLiveFirebase = false;
      this.connectionStatus = 'unconfigured';
      this.connectionError = null;
      this.initLocalFallback();
    }
  }

  // 로컬 폴백 모드 초기화 (예시 기본 회원 3명)
  initLocalFallback() {
    const existing = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
    if (!existing) {
      const now = Date.now();
      const defaultUsers = [
        {
          uid: 'usr-admin-001',
          email: 'admin@gmail.com',
          password: 'password1234',
          name: '총괄 관리자',
          phone: '010-1234-5678',
          role: 'admin',
          isVerified: true,
          status: 'active',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString()
        },
        {
          uid: 'usr-today-001',
          email: 'kim.coffee@naver.com',
          password: 'password1234',
          name: '김라떼',
          phone: '010-9876-5432',
          role: 'user',
          isVerified: true,
          status: 'active',
          createdAt: new Date(now - 1000 * 60 * 180).toISOString()
        },
        {
          uid: 'usr-today-002',
          email: 'lee.espresso@gmail.com',
          password: 'password1234',
          name: '이모카',
          phone: '010-5555-4444',
          role: 'user',
          isVerified: true,
          status: 'active',
          createdAt: new Date(now - 1000 * 60 * 65).toISOString()
        }
      ];
      localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    }
  }

  getConnectionInfo() {
    return {
      isLiveFirebase: this.isLiveFirebase,
      status: this.connectionStatus,
      projectId: window.FIREBASE_CONFIG ? window.FIREBASE_CONFIG.projectId : '미설정',
      error: this.connectionError
    };
  }

  // Firestore 문서 데이터를 표준 사용자 객체로 정규화
  normalizeUserData(data, docId) {
    if (!data) return null;
    let createdAtIso = new Date().toISOString();

    if (data.createdAt) {
      if (typeof data.createdAt.toDate === 'function') {
        createdAtIso = data.createdAt.toDate().toISOString();
      } else if (typeof data.createdAt === 'string') {
        createdAtIso = data.createdAt;
      }
    }

    return {
      uid: data.uid || docId,
      email: data.email || '',
      name: data.name || (data.email === 'admin@gmail.com' ? '총괄 관리자' : '회원'),
      phone: data.phone || '010-0000-0000',
      role: data.role || (data.email === 'admin@gmail.com' ? 'admin' : 'user'),
      isVerified: data.isVerified !== undefined ? data.isVerified : true,
      status: data.status || 'active',
      createdAt: createdAtIso
    };
  }

  // Firestore에서 사용자 프로필 정보 조회
  async getUserProfileFromFirestore(uid) {
    if (!this.db) return null;
    try {
      const doc = await this.db.collection('users').doc(uid).get();
      if (doc.exists) {
        return this.normalizeUserData(doc.data(), doc.id);
      }
    } catch (e) {
      console.warn('Firestore 프로필 조회 오류:', e);
    }
    return null;
  }

  // 실제 Firebase에 admin@gmail.com 관리자 계정 생성 보장
  async ensureAdminUserExists() {
    if (!this.isLiveFirebase || !this.db || !this.auth) return;
    try {
      const snap = await this.db.collection('users').where('email', '==', 'admin@gmail.com').get();
      if (snap.empty) {
        let adminUid = 'admin-uid';
        try {
          const cred = await this.auth.createUserWithEmailAndPassword('admin@gmail.com', 'password1234');
          adminUid = cred.user.uid;
        } catch (e) {
          // 이미 Auth에 존재할 경우 signIn 시도
          try {
            const cred = await this.auth.signInWithEmailAndPassword('admin@gmail.com', 'password1234');
            adminUid = cred.user.uid;
          } catch (signInErr) {
            console.warn('관리자 기존 계정 확인:', signInErr);
          }
        }

        await this.db.collection('users').doc(adminUid).set({
          uid: adminUid,
          email: 'admin@gmail.com',
          name: '총괄 관리자',
          phone: '010-1234-5678',
          role: 'admin',
          isVerified: true,
          status: 'active',
          createdAt: new Date().toISOString()
        }, { merge: true });

        console.log('✅ [Firebase] 관리자(admin@gmail.com) 계정이 Cloud Firestore에 동기화되었습니다.');
      }
    } catch (err) {
      console.warn('관리자 계정 확인 중:', err);
    }
  }

  getCurrentUser() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setCurrentUser(user, notify = true) {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_USER);
    }
    if (notify) {
      this.notifyAuthListeners(user);
    }
  }

  notifyAuthListeners(user) {
    this.authListeners.forEach((cb) => {
      try {
        cb(user);
      } catch (err) {
        console.error('Auth listener error:', err);
      }
    });
  }

  onAuthStateChanged(callback) {
    this.authListeners.add(callback);
    callback(this.getCurrentUser());
    return () => this.authListeners.delete(callback);
  }

  /**
   * 로그인 (Firebase Auth or 로컬)
   */
  async signIn(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPw = (password || '').trim();

    // 1) 실제 Firebase 연결 모드
    if (this.isLiveFirebase && this.auth) {
      try {
        const cred = await this.auth.signInWithEmailAndPassword(cleanEmail, cleanPw);
        let profile = await this.getUserProfileFromFirestore(cred.user.uid);

        if (!profile) {
          profile = {
            uid: cred.user.uid,
            email: cred.user.email,
            name: cred.user.displayName || (cleanEmail === 'admin@gmail.com' ? '총괄 관리자' : '회원'),
            phone: '010-0000-0000',
            role: cleanEmail === 'admin@gmail.com' ? 'admin' : 'user',
            isVerified: true,
            status: 'active',
            createdAt: new Date().toISOString()
          };
          if (this.db) {
            await this.db.collection('users').doc(cred.user.uid).set(profile, { merge: true });
          }
        }

        this.setCurrentUser(profile);
        return profile;
      } catch (err) {
        let msg = err.message;
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          msg = '등록되지 않은 이메일이거나 비밀번호가 올바르지 않습니다.';
        } else if (err.code === 'auth/wrong-password') {
          msg = '비밀번호가 일치하지 않습니다.';
        } else if (err.code === 'auth/network-request-failed') {
          msg = 'Firebase 네트워크 연결에 실패했습니다. 인터넷 연결 및 API 키를 확인해주세요.';
        }
        throw new Error(msg);
      }
    }

    // 2) 브라우저 로컬 스토리지 모드
    const users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.USERS) || '[]');
    const target = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!target) {
      throw new Error('등록되지 않은 이메일 계정입니다.');
    }
    if (target.password !== cleanPw) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }

    const sessionUser = {
      uid: target.uid,
      email: target.email,
      name: target.name,
      phone: target.phone,
      role: target.role,
      isVerified: target.isVerified,
      createdAt: target.createdAt,
      lastLoginAt: new Date().toISOString()
    };

    this.setCurrentUser(sessionUser);
    return sessionUser;
  }

  /**
   * 일반 회원가입 (자동 인증)
   */
  async signUp(email, password, name, phone) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPw = (password || '').trim();
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();

    if (!cleanEmail || !cleanPw || !cleanName) {
      throw new Error('이메일, 비밀번호, 이름을 모두 입력해 주세요.');
    }
    if (cleanPw.length < 6) {
      throw new Error('비밀번호는 최소 6자 이상이어야 합니다.');
    }

    const isAdm = cleanEmail === 'admin@gmail.com';

    // 1) 실제 Firebase 연결 모드
    if (this.isLiveFirebase && this.auth && this.db) {
      try {
        // Firebase Authentication 사용자 생성
        const cred = await this.auth.createUserWithEmailAndPassword(cleanEmail, cleanPw);

        if (cred.user.updateProfile) {
          await cred.user.updateProfile({ displayName: cleanName });
        }

        // Cloud Firestore 'users' 컬렉션에 회원 데이터 실시간 저장
        const firestoreUserData = {
          uid: cred.user.uid,
          email: cleanEmail,
          name: cleanName,
          phone: cleanPhone || '010-0000-0000',
          role: isAdm ? 'admin' : 'user',
          isVerified: true, // 자동 인증
          status: 'active',
          createdAt: new Date().toISOString()
        };

        await this.db.collection('users').doc(cred.user.uid).set(firestoreUserData);
        console.log('✅ [Firestore] 회원이 Cloud Firestore "users" 컬렉션에 실시간 등록되었습니다:', firestoreUserData);

        // 로컬 캐시에도 보관
        this.saveUserToLocalCache(firestoreUserData);
        this.setCurrentUser(firestoreUserData);
        return firestoreUserData;
      } catch (err) {
        let msg = err.message;
        if (err.code === 'auth/email-already-in-use') {
          msg = '이미 Firebase에 가입된 이메일 주소입니다.';
        } else if (err.code === 'auth/operation-not-allowed') {
          msg = 'Firebase 콘솔에서 [Authentication] > [이메일/비밀번호] 로그인이 활성화되지 않았습니다. 콘솔에서 활성화해주세요.';
        } else if (err.code === 'permission-denied') {
          msg = 'Firestore 권한 오류: 콘솔 [Firestore Database] > [규칙(Rules)]에서 쓰기 권한을 허용해주세요.';
        }
        throw new Error(msg);
      }
    }

    // 2) 브라우저 로컬 스토리지 모드
    const users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.USERS) || '[]');
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('이미 가입된 이메일 주소입니다.');
    }

    const newUser = {
      uid: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: cleanEmail,
      password: cleanPw,
      name: cleanName,
      phone: cleanPhone || '010-0000-0000',
      role: isAdm ? 'admin' : 'user',
      isVerified: true, // 자동 인증
      status: 'active',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(users));

    const sessionUser = {
      uid: newUser.uid,
      email: newUser.email,
      name: newUser.name,
      phone: newUser.phone,
      role: newUser.role,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt,
      lastLoginAt: new Date().toISOString()
    };

    this.setCurrentUser(sessionUser);
    return sessionUser;
  }

  saveUserToLocalCache(user) {
    try {
      const users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.USERS) || '[]');
      const filtered = users.filter((u) => u.uid !== user.uid && u.email !== user.email);
      filtered.push(user);
      localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(filtered));
    } catch (e) {
      console.warn('로컬 캐시 저장 오류:', e);
    }
  }

  /**
   * 로그아웃
   */
  async signOut() {
    if (this.isLiveFirebase && this.auth) {
      try {
        await this.auth.signOut();
      } catch (e) {
        console.warn('Firebase signOut 오류:', e);
      }
    }
    this.setCurrentUser(null);
  }

  /**
   * 오늘 신규 가입 회원 목록 조회 (Firestore or 로컬)
   */
  async getTodayNewUsers() {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1) 실제 Firestore 연결 모드
    if (this.isLiveFirebase && this.db) {
      try {
        const snap = await this.db.collection('users').get();
        const users = [];
        snap.forEach((doc) => {
          const item = this.normalizeUserData(doc.data(), doc.id);
          if (item && item.role !== 'admin') {
            const dateStr = (item.createdAt || '').split('T')[0];
            if (dateStr === todayStr) {
              users.push(item);
            }
          }
        });
        users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return users;
      } catch (err) {
        console.warn('Firestore 오늘 회원 조회 오류 (로컬 폴백 사용):', err);
      }
    }

    // 2) 브라우저 로컬 스토리지 모드
    const users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.USERS) || '[]');
    const todayUsers = users.filter((u) => {
      if (u.role === 'admin') return false;
      const userDate = (u.createdAt || '').split('T')[0];
      return userDate === todayStr;
    });

    todayUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return todayUsers;
  }

  /**
   * 전체 일반 회원 목록 조회
   */
  async getAllUsers() {
    // 1) 실제 Firestore 연결 모드
    if (this.isLiveFirebase && this.db) {
      try {
        const snap = await this.db.collection('users').get();
        const users = [];
        snap.forEach((doc) => {
          const item = this.normalizeUserData(doc.data(), doc.id);
          if (item) users.push(item);
        });
        return users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } catch (err) {
        console.warn('Firestore 전체 회원 조회 오류 (로컬 폴백 사용):', err);
      }
    }

    // 2) 브라우저 로컬 스토리지 모드
    const users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.USERS) || '[]');
    return users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

// 전역 싱글톤 인스턴스 등록
window.cafeAuth = new FirebaseAuthService();
