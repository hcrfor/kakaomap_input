/**
 * 파일 경로: public/app.js
 * 역할: 그룹/아이콘/색상 선택 UI, 엑셀 업로드/미리보기, SSE 실시간 상태 및 로그 연동을 담당합니다.
 */

const ICON_SVGS = {
  star: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.31l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94L12 2.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 21s-7.2-4.64-9.5-9.03C.75 8.63 2.58 4.5 6.4 4.5c2.16 0 3.85 1.1 4.6 2.34C11.75 5.6 13.44 4.5 15.6 4.5c3.82 0 5.65 4.13 3.9 7.47C19.2 16.36 12 21 12 21z"/></svg>',
  thunder: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  smile: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none"/><path d="M8.5 14.5c1 1.5 2.2 2 3.5 2s2.5-.5 3.5-2" stroke-linecap="round"/></svg>',
  shine: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2z"/></svg>',
  clover: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="9" cy="8.5" r="3.6"/><circle cx="15" cy="8.5" r="3.6"/><circle cx="9" cy="14.5" r="3.6"/><circle cx="15" cy="14.5" r="3.6"/><path d="M11.2 16h1.6v5h-1.6z"/></svg>',
  rect: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2.5"/></svg>',
  like: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 6.59 7.59C6.22 7.95 6 8.45 6 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>'
};

const state = {
  icons: [],
  colors: [],
  selectedIcon: '01',
  selectedColor: '01',
  selectedPrivacy: 'P',
  parsedItems: [],
  lastFailedItems: [],
  wasRunningInSession: false,
  isRunning: false
};

const BASE_DOCUMENT_TITLE = document.title;

const els = {
  groupNameInput: document.getElementById('groupNameInput'),
  privacyControl: document.getElementById('privacyControl'),
  iconGrid: document.getElementById('iconGrid'),
  colorPalette: document.getElementById('colorPalette'),
  previewIconCircle: document.getElementById('previewIconCircle'),
  previewGroupText: document.getElementById('previewGroupText'),
  dropzone: document.getElementById('dropzone'),
  excelFileInput: document.getElementById('excelFileInput'),
  selectFileBtn: document.getElementById('selectFileBtn'),
  fileSummary: document.getElementById('fileSummary'),
  fileNameText: document.getElementById('fileNameText'),
  sheetNameText: document.getElementById('sheetNameText'),
  totalCountPill: document.getElementById('totalCountPill'),
  validCountPill: document.getElementById('validCountPill'),
  invalidCountPill: document.getElementById('invalidCountPill'),
  limitWarningBox: document.getElementById('limitWarningBox'),
  phaseBanner: document.getElementById('phaseBanner'),
  phaseBannerIcon: document.getElementById('phaseBannerIcon'),
  phaseBannerTitle: document.getElementById('phaseBannerTitle'),
  phaseBannerDesc: document.getElementById('phaseBannerDesc'),
  delaySelect: document.getElementById('delaySelect'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  progressArea: document.getElementById('progressArea'),
  progressLabel: document.getElementById('progressLabel'),
  progressPercent: document.getElementById('progressPercent'),
  progressBar: document.getElementById('progressBar'),
  cntSuccess: document.getElementById('cntSuccess'),
  cntSkipped: document.getElementById('cntSkipped'),
  cntFailed: document.getElementById('cntFailed'),
  tableCountBadge: document.getElementById('tableCountBadge'),
  previewTableBody: document.getElementById('previewTableBody'),
  logConsole: document.getElementById('logConsole'),
  clearLogBtn: document.getElementById('clearLogBtn'),
  headerConnectionBadge: document.getElementById('headerConnectionBadge'),
  headerStatusText: document.getElementById('headerStatusText'),
  completionModal: document.getElementById('completionModal'),
  completionModalIcon: document.getElementById('completionModalIcon'),
  completionModalTitle: document.getElementById('completionModalTitle'),
  completionModalDesc: document.getElementById('completionModalDesc'),
  modalTotalCount: document.getElementById('modalTotalCount'),
  modalSuccessCount: document.getElementById('modalSuccessCount'),
  modalSkippedCount: document.getElementById('modalSkippedCount'),
  modalFailedCount: document.getElementById('modalFailedCount'),
  modalFailedSection: document.getElementById('modalFailedSection'),
  modalFailedList: document.getElementById('modalFailedList'),
  retryFailedBtn: document.getElementById('retryFailedBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  checkGroupItem: document.getElementById('checkGroupItem'),
  checkGroupText: document.getElementById('checkGroupText'),
  checkExcelItem: document.getElementById('checkExcelItem'),
  checkExcelText: document.getElementById('checkExcelText'),
  openGuideBtn: document.getElementById('openGuideBtn'),
  guideModal: document.getElementById('guideModal'),
  closeGuideBtn: document.getElementById('closeGuideBtn'),
  closeGuideTopBtn: document.getElementById('closeGuideTopBtn')
};

function appendLog(level, message, timeText) {
  const line = document.createElement('div');
  line.className = `log-line ${level || 'info'}`;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = `[${timeText || new Date().toLocaleTimeString('ko-KR', { hour12: false })}]`;

  const msgSpan = document.createElement('span');
  msgSpan.textContent = message;

  line.appendChild(timeSpan);
  line.appendChild(msgSpan);
  els.logConsole.appendChild(line);
  els.logConsole.scrollTop = els.logConsole.scrollHeight;
}

function updateStartButtonState() {
  const groupName = els.groupNameInput.value.trim();
  const hasGroup = groupName.length > 0;
  const hasItems = state.parsedItems.length > 0;

  // 체크리스트 상태 갱신
  els.checkGroupItem.classList.toggle('done', hasGroup);
  els.checkGroupItem.querySelector('.check-dot').textContent = hasGroup ? '✓' : '○';
  els.checkGroupText.textContent = hasGroup
    ? `STEP 1: 그룹명 "${groupName}" 설정 완료`
    : 'STEP 1: 즐겨찾기 그룹명을 입력해 주세요';

  els.checkExcelItem.classList.toggle('done', hasItems);
  els.checkExcelItem.querySelector('.check-dot').textContent = hasItems ? '✓' : '○';
  els.checkExcelText.textContent = hasItems
    ? `STEP 2: 좌표 ${state.parsedItems.length}건 불러오기 완료`
    : 'STEP 2: 엑셀 파일을 선택해 주세요';

  // 작업이 실행 중일 때만 버튼을 잠그고, 평상시에는 클릭 시 누락된 단계로 안내할 수 있도록 활성화 유지
  els.startBtn.disabled = state.isRunning;
  els.stopBtn.classList.toggle('hidden', !state.isRunning);
}

function updatePreviewChip() {
  const iconObj = state.icons.find((i) => i.code === state.selectedIcon) || { key: 'star' };
  const colorObj = state.colors.find((c) => c.code === state.selectedColor) || { hex: '#ff5d5e' };

  els.previewIconCircle.style.backgroundColor = colorObj.hex;
  els.previewIconCircle.innerHTML = ICON_SVGS[iconObj.key] || ICON_SVGS.star;
  els.previewGroupText.textContent = els.groupNameInput.value.trim() || '새 그룹';
}

function renderIconAndColorPickers() {
  els.iconGrid.innerHTML = '';
  state.icons.forEach((icon) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `icon-option ${icon.code === state.selectedIcon ? 'selected' : ''}`;
    btn.innerHTML = `${ICON_SVGS[icon.key] || ''}<span>${icon.label}</span>`;
    btn.addEventListener('click', () => {
      state.selectedIcon = icon.code;
      renderIconAndColorPickers();
      updatePreviewChip();
    });
    els.iconGrid.appendChild(btn);
  });

  els.colorPalette.innerHTML = '';
  state.colors.forEach((color) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `color-swatch ${color.code === state.selectedColor ? 'selected' : ''}`;
    btn.style.backgroundColor = color.hex;
    btn.title = `${color.label} (${color.hex})`;
    btn.setAttribute('aria-label', color.label);
    btn.addEventListener('click', () => {
      state.selectedColor = color.code;
      renderIconAndColorPickers();
      updatePreviewChip();
    });
    els.colorPalette.appendChild(btn);
  });

  updatePreviewChip();
}

function renderPreviewTable(items) {
  els.previewTableBody.innerHTML = '';

  if (!items || items.length === 0) {
    els.previewTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">유효한 데이터가 없습니다.</td>
      </tr>
    `;
    els.tableCountBadge.textContent = '0건';
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const tr = document.createElement('tr');
    tr.id = `row-item-${item.index}`;
    tr.innerHTML = `
      <td>${item.index}</td>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td>${item.lat}</td>
      <td>${item.lng}</td>
      <td><span class="row-status pending" id="row-status-${item.index}">대기</span></td>
    `;
    fragment.appendChild(tr);
  });

  els.previewTableBody.appendChild(fragment);
  els.tableCountBadge.textContent = `총 ${items.length}건`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function handleExcelUpload(file) {
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  appendLog('info', `엑셀 파일 분석 중: ${file.name}`);

  try {
    const res = await fetch('/api/parse-excel', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '파일 분석 실패');
    }

    state.parsedItems = data.validItems || [];

    els.fileSummary.classList.remove('hidden');
    els.fileNameText.textContent = data.fileName;
    els.sheetNameText.textContent = `시트: ${data.sheetName}`;
    els.totalCountPill.textContent = `전체 ${data.totalCount}건`;
    els.validCountPill.textContent = `정상 ${data.validCount}건`;

    if (data.invalidCount > 0) {
      els.invalidCountPill.textContent = `오류 ${data.invalidCount}건`;
      els.invalidCountPill.classList.remove('hidden');
      data.invalidItems.slice(0, 5).forEach((bad) => {
        appendLog('warn', `엑셀 ${bad.rowNumber}행 제외됨 (${bad.name}): ${bad.reason}`);
      });
    } else {
      els.invalidCountPill.classList.add('hidden');
    }

    els.limitWarningBox.classList.toggle('hidden', data.validCount <= 1000);

    renderPreviewTable(state.parsedItems);
    if (!state.isRunning) {
      updatePhaseBanner({
        phase: 'idle',
        message: '그룹 설정과 엑셀 파일을 선택한 뒤 시작 버튼을 누르면 카카오 로그인 화면이 열립니다. 로그인만 수동으로 완료해 주세요!'
      });
    }
    updateStartButtonState();
    appendLog('success', `엑셀 분석 완료! 등록 가능한 좌표 ${data.validCount}건을 불러왔습니다.`);
  } catch (err) {
    state.parsedItems = [];
    renderPreviewTable([]);
    updateStartButtonState();
    appendLog('error', err.message);
    alert(err.message);
  }
}

function showCompletionModal(payload) {
  const { groupName, summary = {} } = payload;
  const total = summary.total ?? 0;
  const success = summary.success ?? 0;
  const skipped = summary.skipped ?? 0;
  const failed = summary.failed ?? 0;
  const failedItems = Array.isArray(summary.failedItems) ? summary.failedItems : [];

  state.lastFailedItems = failedItems;

  els.completionModalIcon.textContent = failed > 0 ? '⚠️' : '🎉';
  els.completionModalTitle.textContent =
    failed > 0
      ? '즐겨찾기 등록이 완료되었습니다 (일부 실패 확인)'
      : '카카오맵 즐겨찾기 등록이 완료되었습니다!';

  const groupLabel = groupName ? `"${groupName}" 그룹에 ` : '';
  els.completionModalDesc.textContent =
    failed > 0
      ? `${groupLabel}총 ${total}건 중 ${success + skipped}건이 처리되었고, ${failed}건이 실패했습니다.`
      : `${groupLabel}요청하신 모든 좌표 등록 처리가 성공적으로 끝났습니다.`;

  els.modalTotalCount.textContent = total;
  els.modalSuccessCount.textContent = success;
  els.modalSkippedCount.textContent = skipped;
  els.modalFailedCount.textContent = failed;

  if (failedItems.length > 0) {
    els.modalFailedSection.classList.remove('hidden');
    els.retryFailedBtn.classList.remove('hidden');
    els.modalFailedList.innerHTML = '';
    failedItems.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(item.error || '알 수 없는 오류')}`;
      els.modalFailedList.appendChild(li);
    });
  } else {
    els.modalFailedSection.classList.add('hidden');
    els.retryFailedBtn.classList.add('hidden');
  }

  els.completionModal.classList.remove('hidden');
}

function hideCompletionModal() {
  els.completionModal.classList.add('hidden');
}

function showGuideModal() {
  els.guideModal.classList.remove('hidden');
}

function hideGuideModal() {
  els.guideModal.classList.add('hidden');
}

function updatePhaseBanner(payload) {
  const { phase, message, current, total, summary } = payload;

  const activePhases = ['launching', 'waiting_login', 'creating_group', 'registering'];
  state.isRunning = activePhases.includes(phase);
  if (state.isRunning) {
    state.wasRunningInSession = true;
  }
  updateStartButtonState();

  els.phaseBanner.className = `login-guide-banner ${phase || 'idle'}`;

  const bannerMeta = {
    idle: { icon: '🔐', title: '실행 준비 완료' },
    launching: { icon: '🌐', title: '크롬 브라우저 실행 중...' },
    waiting_login: { icon: '👉', title: '카카오 수동 로그인 대기 중!' },
    creating_group: { icon: '📁', title: '즐겨찾기 그룹 생성 중...' },
    registering: { icon: '📍', title: '좌표 일괄 등록 진행 중...' },
    completed: { icon: '✅', title: '즐겨찾기 등록 완료!' },
    stopped: { icon: '⏹️', title: '작업 중단됨' },
    error: { icon: '❌', title: '오류 발생' }
  }[phase] || { icon: 'ℹ️', title: '상태 안내' };

  els.phaseBannerIcon.textContent = bannerMeta.icon;
  els.phaseBannerTitle.textContent = bannerMeta.title;
  els.phaseBannerDesc.textContent = message || '';

  if (phase === 'idle') {
    els.progressArea.classList.add('hidden');
    els.progressBar.style.width = '0%';
  } else if (typeof total === 'number' && total > 0) {
    els.progressArea.classList.remove('hidden');
    const cur = current || 0;
    const pct = Math.min(100, Math.round((cur / total) * 100));
    els.progressLabel.textContent = `${cur} / ${total} 처리됨`;
    els.progressPercent.textContent = `${pct}%`;
    els.progressBar.style.width = `${pct}%`;

    if (state.isRunning) {
      document.title = `(${cur}/${total}) ${BASE_DOCUMENT_TITLE}`;
    }
  }

  if (summary) {
    els.cntSuccess.textContent = summary.success ?? 0;
    els.cntSkipped.textContent = summary.skipped ?? 0;
    els.cntFailed.textContent = summary.failed ?? 0;
  }

  if (phase === 'completed') {
    document.title = `✅ 등록 완료! - ${BASE_DOCUMENT_TITLE}`;
    if (state.wasRunningInSession) {
      state.wasRunningInSession = false;
      showCompletionModal(payload);
    }
  } else if (phase === 'stopped' || phase === 'error' || phase === 'idle') {
    document.title = BASE_DOCUMENT_TITLE;
    state.wasRunningInSession = false;
  }
}

function connectSSE() {
  const es = new EventSource('/api/events');

  es.onopen = () => {
    els.headerConnectionBadge.classList.remove('offline');
    els.headerStatusText.textContent = '서버 연결됨';
  };

  es.onerror = () => {
    els.headerConnectionBadge.classList.add('offline');
    els.headerStatusText.textContent = '연결 재시도 중...';
  };

  es.addEventListener('status', (e) => {
    const payload = JSON.parse(e.data);
    updatePhaseBanner(payload);
  });

  es.addEventListener('log', (e) => {
    const payload = JSON.parse(e.data);
    appendLog(payload.level, payload.message, payload.time);
  });

  es.addEventListener('item-progress', (e) => {
    const { index, status, message } = JSON.parse(e.data);
    const badge = document.getElementById(`row-status-${index}`);
    if (badge) {
      badge.className = `row-status ${status}`;
      badge.textContent = message;
      const row = document.getElementById(`row-item-${index}`);
      if (row && status === 'processing') {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  });
}

async function startAutomation(itemsToRun) {
  const groupName = els.groupNameInput.value.trim();
  if (!groupName) {
    alert('먼저 STEP 1에서 카카오맵 즐겨찾기 그룹명을 입력해 주세요.');
    els.groupNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    els.groupNameInput.focus();
    return;
  }
  if (!itemsToRun || itemsToRun.length === 0) {
    alert('먼저 STEP 2에서 엑셀 파일을 선택해 주세요.');
    els.dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  hideCompletionModal();
  state.wasRunningInSession = true;

  // 실행 대상 행 상태만 대기로 초기화
  itemsToRun.forEach((item) => {
    const badge = document.getElementById(`row-status-${item.index}`);
    if (badge) {
      badge.className = 'row-status pending';
      badge.textContent = '대기';
    }
  });

  try {
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupName,
        iconCode: state.selectedIcon,
        colorCode: state.selectedColor,
        privacy: state.selectedPrivacy,
        delayMs: Number(els.delaySelect.value),
        items: itemsToRun
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '작업을 시작할 수 없습니다.');
    }
  } catch (err) {
    state.wasRunningInSession = false;
    alert(err.message);
    appendLog('error', err.message);
  }
}

function bindEvents() {
  const handleGroupInput = () => {
    updatePreviewChip();
    updateStartButtonState();
  };
  els.groupNameInput.addEventListener('input', handleGroupInput);
  els.groupNameInput.addEventListener('change', handleGroupInput);
  els.groupNameInput.addEventListener('compositionend', handleGroupInput);

  els.privacyControl.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.selectedPrivacy = btn.dataset.privacy;
    els.privacyControl.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });

  els.selectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    els.excelFileInput.click();
  });

  els.dropzone.addEventListener('click', () => {
    els.excelFileInput.click();
  });

  els.excelFileInput.addEventListener('change', (e) => {
    if (e.target.files?.[0]) {
      handleExcelUpload(e.target.files[0]);
    }
  });

  els.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropzone.classList.add('dragover');
  });

  els.dropzone.addEventListener('dragleave', () => {
    els.dropzone.classList.remove('dragover');
  });

  els.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('dragover');
    if (e.dataTransfer.files?.[0]) {
      handleExcelUpload(e.dataTransfer.files[0]);
    }
  });

  els.clearLogBtn.addEventListener('click', () => {
    els.logConsole.innerHTML = '';
  });

  els.startBtn.addEventListener('click', () => startAutomation(state.parsedItems));

  els.openGuideBtn.addEventListener('click', showGuideModal);
  els.closeGuideBtn.addEventListener('click', hideGuideModal);
  els.closeGuideTopBtn.addEventListener('click', hideGuideModal);

  els.guideModal.addEventListener('click', (e) => {
    if (e.target === els.guideModal) {
      hideGuideModal();
    }
  });

  els.closeModalBtn.addEventListener('click', hideCompletionModal);

  els.completionModal.addEventListener('click', (e) => {
    if (e.target === els.completionModal) {
      hideCompletionModal();
    }
  });

  els.retryFailedBtn.addEventListener('click', () => {
    if (state.lastFailedItems.length > 0) {
      startAutomation(state.lastFailedItems);
    }
  });

  els.stopBtn.addEventListener('click', async () => {
    els.stopBtn.disabled = true;
    try {
      await fetch('/api/stop', { method: 'POST' });
    } finally {
      els.stopBtn.disabled = false;
    }
  });
}

async function init() {
  bindEvents();
  connectSSE();

  try {
    const res = await fetch('/api/meta');
    const data = await res.json();
    state.icons = data.icons || [];
    state.colors = data.colors || [];
    renderIconAndColorPickers();
    if (data.state) {
      updatePhaseBanner(data.state);
    }
    updatePreviewChip();
    updateStartButtonState();
  } catch (err) {
    appendLog('error', '서버 메타데이터를 불러오지 못했습니다.');
  }
}

init();

