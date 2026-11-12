/**
 * 파일 경로: src/kakaoAutomation.js
 * 역할: Playwright를 이용해 실제 크롬 브라우저를 실행하고,
 *      사용자의 수동 카카오 로그인 이후 즐겨찾기 그룹 생성 및 엑셀 좌표 일괄 등록을 자동 수행합니다.
 */

const { chromium } = require('playwright');

/**
 * 카카오맵 그룹 아이콘 코드(01~10) 메타데이터
 */
const KAKAO_ICONS = [
  { code: '01', key: 'star', label: '별' },
  { code: '02', key: 'heart', label: '하트' },
  { code: '03', key: 'thunder', label: '번개' },
  { code: '04', key: 'check', label: '체크' },
  { code: '05', key: 'eye', label: '눈' },
  { code: '06', key: 'smile', label: '스마일' },
  { code: '07', key: 'shine', label: '반짝임' },
  { code: '08', key: 'clover', label: '클로버' },
  { code: '09', key: 'rect', label: '사각형' },
  { code: '10', key: 'like', label: '좋아요' }
];

/**
 * 카카오맵 즐겨찾기 마커 색상 코드(01~07) 메타데이터
 */
const KAKAO_COLORS = [
  { code: '01', hex: '#ff5d5e', label: '빨강' },
  { code: '02', hex: '#ffb301', label: '노랑' },
  { code: '03', hex: '#ff7e1b', label: '주황' },
  { code: '04', hex: '#2fd046', label: '연두' },
  { code: '05', hex: '#12a05f', label: '초록' },
  { code: '06', hex: '#9981ff', label: '보라' },
  { code: '07', hex: '#f179dc', label: '분홍' }
];

const KAKAO_LOGIN_URL = 'https://accounts.kakao.com/login/?continue=https%3A%2F%2Fmap.kakao.com#login';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * PC에 설치된 크롬, 엣지, 또는 Playwright 내장 Chromium 순으로 브라우저를 안전하게 실행합니다.
 */
async function launchVisibleBrowser() {
  const launchOptions = {
    headless: false,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
  };

  for (const channel of ['chrome', 'msedge', undefined]) {
    try {
      const opts = channel ? { ...launchOptions, channel } : launchOptions;
      return await chromium.launch(opts);
    } catch (err) {
      // 다음 브라우저 채널 시도
    }
  }
  throw new Error('실행 가능한 크롬/엣지 브라우저를 찾을 수 없습니다.');
}

class KakaoMapAutomator {
  constructor(emitEvent) {
    this.emit = emitEvent;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isRunning = false;
    this.abortRequested = false;
    this.lastDialogMessage = '';
  }

  log(level, message) {
    this.emit('log', {
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      level,
      message
    });
  }

  setStatus(phase, message, extra = {}) {
    this.emit('status', { phase, message, ...extra });
  }

  /**
   * 사용자가 중단 버튼을 눌렀을 때 안전하게 작업을 종료합니다.
   */
  async stop() {
    this.abortRequested = true;
    this.log('warn', '사용자의 요청으로 자동 등록 작업을 중단합니다...');
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (_) {
        // 이미 닫힌 경우 무시
      }
    }
  }

  checkAborted() {
    if (this.abortRequested) {
      throw new Error('USER_ABORTED');
    }
  }

  /**
   * 전체 자동화 워크플로우를 실행합니다.
   */
  async run({ groupName, iconCode = '01', colorCode = '01', privacy = 'P', delayMs = 600, items = [] }) {
    if (this.isRunning) {
      throw new Error('이미 자동 등록 작업이 진행 중입니다.');
    }

    this.isRunning = true;
    this.abortRequested = false;
    this.lastDialogMessage = '';

    const summary = {
      total: items.length,
      success: 0,
      skipped: 0,
      failed: 0,
      failedItems: []
    };

    try {
      this.setStatus('launching', '크롬 브라우저를 열고 있습니다...');
      this.log('info', '크롬 브라우저를 실행합니다.');

      this.browser = await launchVisibleBrowser();
      this.browser.on('disconnected', () => {
        if (this.isRunning && !this.abortRequested) {
          this.abortRequested = true;
        }
      });

      this.context = await this.browser.newContext({ viewport: null });
      this.page = await this.context.newPage();

      // 카카오맵의 alert / confirm 다이얼로그를 자동으로 감지하고 기록합니다.
      this.page.on('dialog', async (dialog) => {
        const msg = dialog.message();
        this.lastDialogMessage = msg;
        this.log('warn', `카카오맵 알림: "${msg}"`);
        try {
          await dialog.accept();
        } catch (_) {
          // 무시
        }
      });

      // 1단계: 카카오 로그인 화면 접속 및 수동 로그인 대기
      await this.waitForManualLogin();
      this.checkAborted();

      // 2단계: 즐겨찾기 그룹 생성 (또는 기존 동일 그룹 사용)
      await this.createOrReuseFavoriteGroup({ groupName, iconCode, privacy });
      this.checkAborted();

      // 3단계: 엑셀 데이터 순회하며 즐겨찾기 등록
      this.setStatus('registering', `총 ${items.length}개 좌표 등록을 시작합니다.`, {
        current: 0,
        total: items.length,
        summary
      });

      for (let i = 0; i < items.length; i++) {
        this.checkAborted();
        const item = items[i];
        const stepNum = i + 1;

        this.emit('item-progress', {
          index: item.index,
          status: 'processing',
          message: '등록 중...'
        });

        try {
          const result = await this.registerSinglePlaceWithRetry({
            item,
            groupName,
            colorCode,
            maxRetries: 1
          });

          if (result === 'skipped') {
            summary.skipped += 1;
            this.log('warn', `[${stepNum}/${items.length}] 이미 그룹에 등록되어 있어 건너뜀: ${item.name}`);
            this.emit('item-progress', {
              index: item.index,
              status: 'skipped',
              message: '이미 등록됨(건너뜀)'
            });
          } else {
            summary.success += 1;
            this.log('success', `[${stepNum}/${items.length}] 등록 완료: ${item.name} (${item.lat}, ${item.lng})`);
            this.emit('item-progress', {
              index: item.index,
              status: 'success',
              message: '등록 완료'
            });
          }
        } catch (err) {
          if (err.message === 'USER_ABORTED') throw err;
          if (err.message === 'GROUP_FULL') {
            this.log('error', `그룹 "${groupName}"의 최대 저장 한도(1,000개)에 도달하여 중단합니다.`);
            throw new Error(`그룹 "${groupName}"의 저장 한도(1,000개)를 초과했습니다.`);
          }

          summary.failed += 1;
          summary.failedItems.push({ ...item, error: err.message });
          this.log('error', `[${stepNum}/${items.length}] 등록 실패 (${item.name}): ${err.message}`);
          this.emit('item-progress', {
            index: item.index,
            status: 'failed',
            message: err.message
          });
        }

        this.setStatus('registering', `진행 중 (${stepNum} / ${items.length})`, {
          current: stepNum,
          total: items.length,
          summary
        });

        if (i < items.length - 1 && delayMs > 0) {
          await sleep(delayMs);
        }
      }

      this.setStatus(
        'completed',
        `"${groupName}" 그룹에 즐겨찾기 등록이 완료되었습니다! (성공 ${summary.success}건, 건너뜀 ${summary.skipped}건, 실패 ${summary.failed}건)`,
        { current: items.length, total: items.length, groupName, summary }
      );
      this.log('success', `전체 작업 완료! 성공: ${summary.success}, 건너뜀: ${summary.skipped}, 실패: ${summary.failed}`);
      this.log('info', '등록 결과를 직접 확인하실 수 있도록 카카오맵 창은 열어두었습니다.');

      return summary;
    } catch (err) {
      if (err.message === 'USER_ABORTED') {
        this.setStatus('stopped', '작업이 사용자에 의해 중단되었습니다.', { summary });
        this.log('warn', '작업이 중단되었습니다.');
      } else {
        this.setStatus('error', `오류 발생: ${err.message}`, { summary });
        this.log('error', `치명적 오류: ${err.message}`);
      }
      throw err;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 카카오 로그인 페이지를 열고, 사용자가 수동 로그인을 완료하여 map.kakao.com 프로필이 뜰 때까지 대기합니다.
   */
  async waitForManualLogin() {
    this.setStatus('waiting_login', '열린 크롬 창에서 카카오 로그인을 수동으로 완료해 주세요.');
    this.log('info', '카카오 로그인 페이지로 이동합니다. (최대 5분 대기)');

    await this.page.goto(KAKAO_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      this.checkAborted();

      try {
        const currentUrl = this.page.url();
        if (currentUrl.startsWith('https://map.kakao.com')) {
          const isLoggedIn = await this.page.evaluate(() => {
            const profile = document.querySelector('#btnProfile');
            const loginBtn = document.querySelector('#btnLogin');
            const hasProfileVisible = profile && !profile.classList.contains('HIDDEN');
            const loginHidden = !loginBtn || loginBtn.classList.contains('HIDDEN') || getComputedStyle(loginBtn).display === 'none';
            return Boolean(hasProfileVisible || loginHidden);
          });

          if (isLoggedIn) {
            this.log('success', '카카오 로그인이 확인되었습니다!');
            await sleep(1000);
            return;
          }
        }
      } catch (_) {
        // 페이지 리다이렉트 도중 evaluate 오류는 무시하고 재확인
      }

      await sleep(700);
    }

    throw new Error('로그인 대기 시간(5분)이 초과되었습니다. 다시 시도해 주세요.');
  }

  /**
   * MY > 즐겨찾기 탭에서 새 그룹을 생성합니다. 동일한 이름의 그룹이 이미 있으면 기존 그룹을 재사용합니다.
   */
  async createOrReuseFavoriteGroup({ groupName, iconCode, privacy }) {
    this.setStatus('creating_group', `즐겨찾기 그룹 "${groupName}"을(를) 생성하고 있습니다...`);
    this.log('info', `MY > 즐겨찾기 메뉴에서 "${groupName}" 그룹 생성을 시작합니다.`);

    // MY 탭 클릭
    const myTab = this.page.locator('#search\\.tab5 a');
    await myTab.waitFor({ state: 'visible', timeout: 15000 });
    await myTab.click();
    await sleep(600);

    // 하위 탭 중 '즐겨찾기' 활성화 보장
    const favSubTab = this.page.locator('#my\\.subtab\\.favorite a');
    if (await favSubTab.isVisible().catch(() => false)) {
      await favSubTab.click();
      await sleep(500);
    }

    // '새 그룹 추가' 버튼 클릭
    const addFolderBtn = this.page.locator('.btn_addfolder');
    await addFolderBtn.waitFor({ state: 'visible', timeout: 15000 });
    await addFolderBtn.click();

    const addFolderLayer = this.page.locator('[data-id="addFolderLayer"]');
    await addFolderLayer.waitFor({ state: 'visible', timeout: 10000 });

    // 아이콘 모양 선택
    const optionBtn = addFolderLayer.locator('.btn_option');
    await optionBtn.click();
    const iconItem = addFolderLayer.locator(`.list_option li[data-icon="${iconCode}"] a`);
    await iconItem.waitFor({ state: 'visible', timeout: 5000 });
    await iconItem.click();

    // 공개 허용 설정 (P: 비공개, U: 링크공개, O: 공개)
    const privacyMap = { O: 'label[for="open"]', U: 'label[for="link"]', P: 'label[for="private"]' };
    const privacySelector = privacyMap[privacy] || privacyMap.P;
    const privacyLabel = addFolderLayer.locator(privacySelector);
    if (await privacyLabel.isVisible().catch(() => false)) {
      await privacyLabel.click();
    }

    // 그룹명 입력 (readonly 해제 보호를 위해 click 후 fill)
    const folderInput = addFolderLayer.locator('#folderName');
    await folderInput.click();
    await folderInput.fill(groupName);

    this.lastDialogMessage = '';
    const submitBtn = addFolderLayer.locator('[data-id="addFolderOK"]');
    await submitBtn.click();
    await sleep(1200);

    // 동일한 그룹명이 이미 존재하는 경우 기존 그룹을 그대로 사용하도록 모달만 닫기
    if (this.lastDialogMessage.includes('동일한 그룹명')) {
      this.log('warn', `이미 "${groupName}" 그룹이 존재하여 기존 그룹에 이어서 등록합니다.`);
      const closeBtn = addFolderLayer.locator('.btn_close');
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await sleep(400);
      }
      return;
    }

    if (this.lastDialogMessage.includes('최대')) {
      throw new Error(`카카오맵 즐겨찾기 그룹 생성 한도를 초과했습니다: ${this.lastDialogMessage}`);
    }

    this.log('success', `즐겨찾기 그룹 "${groupName}" 준비가 완료되었습니다.`);
  }

  /**
   * 일시적인 네트워크 지연이나 DOM 렌더링 타이밍 이슈에 대비해 실패 시 자동으로 재시도합니다.
   */
  async registerSinglePlaceWithRetry({ item, groupName, colorCode, maxRetries = 1 }) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      this.checkAborted();
      try {
        if (attempt > 0) {
          this.log('warn', `재시도 (${attempt}/${maxRetries}): ${item.name}`);
          await sleep(1200);
        }
        return await this.registerSinglePlace({ item, groupName, colorCode });
      } catch (err) {
        if (err.message === 'USER_ABORTED' || err.message === 'GROUP_FULL') {
          throw err;
        }
        lastError = err;
      }
    }
    throw lastError;
  }

  /**
   * 단일 좌표 링크로 이동하여 지정된 그룹과 색상, 이름으로 즐겨찾기에 저장합니다.
   */
  async registerSinglePlace({ item, groupName, colorCode }) {
    // link/map URL 경로에 쉼표/슬래시 등 특수문자가 있으면 카카오맵 URL 파싱이 깨질 수 있으므로 안전 문자로 치환합니다.
    const urlSafeName = item.name.replace(/[,/\\?#%]/g, '_').trim() || '장소';
    const targetUrl = `https://map.kakao.com/link/map/${encodeURIComponent(urlSafeName)},${item.lat},${item.lng}`;

    await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

    // 지도 위 좌표 말풍선(또는 일반 인포윈도우)의 즐겨찾기 버튼 대기 및 클릭
    const favButton = this.page.locator('.AddressInfoWindow [data-id="fav"], .InfoWindow [data-id="fav"]').first();
    await favButton.waitFor({ state: 'visible', timeout: 15000 });
    await sleep(300);
    await favButton.click();

    // 1단계 모달: 그룹 선택 레이어 대기 (가끔 첫 클릭이 무시될 때를 대비해 1회 재클릭)
    const folderSelectLayer = this.page.locator('[data-id="folderSelectLayer"]');
    try {
      await folderSelectLayer.waitFor({ state: 'visible', timeout: 6000 });
    } catch (_) {
      await favButton.click();
      await folderSelectLayer.waitFor({ state: 'visible', timeout: 10000 });
    }

    // 그룹 목록이 비동기로 채워질 때까지 잠깐 대기 후 해당 그룹명 찾기
    await this.page.waitForFunction(
      (targetGroup) => {
        const items = Array.from(document.querySelectorAll('[data-id="folderSelectLayer"] .list_folder li[data-folderid]'));
        return items.some((li) => {
          const titleEl = li.querySelector('.txt_folder');
          return titleEl && titleEl.textContent.trim() === targetGroup;
        });
      },
      groupName,
      { timeout: 12000 }
    );

    // 그룹명과 정확히 일치하는 항목 탐색
    const folderHandle = await this.page.evaluateHandle((targetGroup) => {
      const list = Array.from(document.querySelectorAll('[data-id="folderSelectLayer"] .list_folder li[data-folderid]'));
      return list.find((li) => {
        const el = li.querySelector('.txt_folder');
        return el && el.textContent.trim() === targetGroup;
      }) || null;
    }, groupName);

    const folderEl = folderHandle.asElement();
    if (!folderEl) {
      throw new Error(`그룹 목록에서 "${groupName}"을(를) 찾을 수 없습니다.`);
    }

    const liClass = (await folderEl.getAttribute('class')) || '';
    if (liClass.includes('SAVED')) {
      // 이미 등록된 상태에서 다시 클릭하면 삭제되므로 반드시 스킵하고 모달을 닫습니다.
      const closeBtn = folderSelectLayer.locator('.btn_close');
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      }
      return 'skipped';
    }

    if (liClass.includes('FULL')) {
      throw new Error('GROUP_FULL');
    }

    await folderEl.scrollIntoViewIfNeeded();
    await folderEl.click();

    // 2단계 모달: 즐겨찾기 이름 및 색상 입력 레이어 대기
    const addFavoriteLayer = this.page.locator('[data-id="addFavoriteLayer"]');
    await addFavoriteLayer.waitFor({ state: 'visible', timeout: 10000 });

    // 이름(#display1) 입력 — focus 시 readonly가 해제되므로 click 후 값 입력 및 확인
    const displayInput = addFavoriteLayer.locator('#display1');
    await displayInput.click();
    await this.page.evaluate((val) => {
      const inp = document.querySelector('[data-id="addFavoriteLayer"] #display1');
      if (inp) {
        inp.removeAttribute('readonly');
        inp.value = val;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, item.name);

    // 색상 선택 (01 ~ 07)
    const colorLi = addFavoriteLayer.locator(`.list_inp li[data-color="${colorCode}"]`);
    if (await colorLi.count()) {
      const colorLabel = colorLi.locator('label');
      await colorLabel.click({ force: true });
    }

    // 완료 클릭
    const addOkBtn = addFavoriteLayer.locator('[data-id="addOK"]');
    await addOkBtn.click();

    // 저장 완료 토스트([data-id="resultLayer"])가 뜨거나 입력 레이어가 닫힐 때까지 대기
    await Promise.race([
      this.page.locator('[data-id="resultLayer"]').waitFor({ state: 'visible', timeout: 8000 }),
      addFavoriteLayer.waitFor({ state: 'hidden', timeout: 8000 })
    ]).catch(() => { });

    // 카카오맵 서버에 저장 요청이 완전히 반영될 짧은 여유 시간 확보
    await sleep(300);

    return 'saved';
  }
}

module.exports = {
  KakaoMapAutomator,
  KAKAO_ICONS,
  KAKAO_COLORS
};
