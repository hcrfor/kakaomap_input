/**
 * 파일 경로: src/server.js
 * 역할: 웹 UI 서빙, 엑셀 업로드/파싱 API, SSE 실시간 진행률 전송, 카카오맵 자동화 제어를 담당하는 Express 서버입니다.
 */

const path = require('path');
const express = require('express');
const multer = require('multer');
const { parseExcelBuffer } = require('./excelParser');
const { KakaoMapAutomator, KAKAO_ICONS, KAKAO_COLORS } = require('./kakaoAutomation');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// 파일 업로드를 디스크에 임시 저장하지 않고 메모리에서 바로 파싱하도록 설정합니다.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 최대 20MB
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// SSE(Server-Sent Events) 구독 클라이언트 목록 관리
const sseClients = new Set();
let currentState = {
  isRunning: false,
  phase: 'idle',
  message: '대기 중'
};

function broadcastEvent(eventName, payload) {
  if (eventName === 'status') {
    currentState = {
      isRunning: ['launching', 'waiting_login', 'creating_group', 'registering'].includes(payload.phase),
      ...payload
    };
  }

  const serialized = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(serialized);
    } catch (_) {
      sseClients.delete(res);
    }
  }
}

const automator = new KakaoMapAutomator(broadcastEvent);

/**
 * 카카오맵 아이콘 및 색상 선택지 메타데이터 조회
 */
app.get('/api/meta', (req, res) => {
  res.json({
    icons: KAKAO_ICONS,
    colors: KAKAO_COLORS,
    state: currentState
  });
});

/**
 * 실시간 진행률 및 로그 수신용 SSE 엔드포인트
 */
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);
  res.write(`event: status\ndata: ${JSON.stringify(currentState)}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (_) {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

/**
 * 엑셀(.xlsx, .xls, .csv) 파일을 업로드 받아 좌표 데이터를 파싱하고 미리보기를 반환합니다.
 */
app.post('/api/parse-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '엑셀 파일을 선택해 주세요.' });
    }

    // 한글 파일명 깨짐 방지 (latin1 -> utf8 보정)
    const decodedName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const result = parseExcelBuffer(req.file.buffer, decodedName);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message || '엑셀 파일 처리 중 오류가 발생했습니다.' });
  }
});

/**
 * 카카오맵 로그인 창을 띄우고 즐겨찾기 그룹 생성 및 일괄 등록을 시작합니다.
 */
app.post('/api/start', (req, res) => {
  if (automator.isRunning) {
    return res.status(409).json({ error: '이미 자동 등록 작업이 진행 중입니다.' });
  }

  const { groupName, iconCode, colorCode, privacy, delayMs, items } = req.body || {};

  if (!groupName || !String(groupName).trim()) {
    return res.status(400).json({ error: '카카오맵 즐겨찾기 그룹명을 입력해 주세요.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '등록할 유효한 좌표 데이터가 없습니다.' });
  }

  // 비동기로 실행을 시작하고 즉시 응답 (진행 상황은 SSE로 실시간 전송)
  res.json({ started: true, count: items.length });

  automator
    .run({
      groupName: String(groupName).trim(),
      iconCode: iconCode || '01',
      colorCode: colorCode || '01',
      privacy: privacy || 'P',
      delayMs: Number.isFinite(Number(delayMs)) ? Math.max(200, Number(delayMs)) : 600,
      items
    })
    .catch(() => {
      // 에러 상태와 로그는 automator 내부에서 SSE로 이미 브로드캐스트됨
    });
});

/**
 * 진행 중인 자동화 작업을 중단합니다.
 */
app.post('/api/stop', async (req, res) => {
  await automator.stop();
  res.json({ stopped: true });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `파일 업로드 오류: ${err.message}` });
  }
  return res.status(500).json({ error: err.message || '서버 내부 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`\n=======================================================`);
  console.log(`  카카오맵 엑셀 즐겨찾기 자동 등록 웹 서버 실행 중!`);
  console.log(`  접속 주소: http://localhost:${PORT}`);
  console.log(`=======================================================\n`);
});

