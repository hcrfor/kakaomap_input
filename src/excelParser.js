/**
 * 파일 경로: src/excelParser.js
 * 역할: 업로드된 엑셀(.xlsx, .xls, .csv) 파일에서 '번호_유형_관리', '위도', '경도' 데이터를 안전하게 추출하고 검증합니다.
 */

const XLSX = require('xlsx');

/**
 * 객체의 키 문자열에서 앞뒤 공백과 연속 공백을 정규화하여 원하는 컬럼 값을 찾습니다.
 * @param {Object} row - 엑셀 한 행 객체
 * @param {string[]} candidateKeys - 우선순위별 후보 컬럼명 목록
 * @returns {string} 추출된 문자열 값 (없으면 빈 문자열)
 */
function pickColumnValue(row, candidateKeys) {
  const normalizedMap = new Map();
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = String(key).replace(/\s+/g, '').trim();
    normalizedMap.set(cleanKey, value);
  }

  for (const candidate of candidateKeys) {
    const cleanCandidate = candidate.replace(/\s+/g, '').trim();
    if (normalizedMap.has(cleanCandidate)) {
      const val = normalizedMap.get(cleanCandidate);
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
  }
  return '';
}

/**
 * 숫자 형태의 위도/경도 문자열을 안전하게 파싱합니다.
 * @param {string|number} raw - 원본 값
 * @returns {number|null} 유효한 실수 또는 null
 */
function parseCoordinate(raw) {
  if (raw === undefined || raw === null) return null;
  const cleaned = String(raw).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * 엑셀 파일 버퍼를 읽어 카카오맵 등록용 항목 목록으로 변환합니다.
 * @param {Buffer} fileBuffer - 업로드된 파일의 바이너리 버퍼
 * @param {string} originalName - 원본 파일명
 * @returns {Object} 파싱된 시트 정보, 유효 항목 목록, 오류 항목 목록
 */
function parseExcelBuffer(fileBuffer, originalName = '') {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('업로드된 파일이 비어 있습니다.');
  }

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;

  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('엑셀 파일에서 시트(Sheet)를 찾을 수 없습니다.');
  }

  // 첫 번째 시트를 기준으로 데이터를 읽어옵니다.
  const firstSheetName = sheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('엑셀 시트에 데이터 행이 존재하지 않습니다.');
  }

  const validItems = [];
  const invalidItems = [];

  rawRows.forEach((row, idx) => {
    const excelRowNumber = idx + 2; // 1번 행은 헤더이므로 데이터는 2번 행부터 시작

    // 1. 즐겨찾기 이름 결정: '번호_유형_관리' 열을 최우선으로 사용
    let name = pickColumnValue(row, ['번호_유형_관리', '장소명', '이름', '명칭']);

    // 만약 '번호_유형_관리'가 비어 있다면 표본점번호/유형/분류를 조합하여 대체 이름 생성
    if (!name) {
      const pointNo = pickColumnValue(row, ['표본점번호']);
      const pointType = pickColumnValue(row, ['표본점유형']);
      const category = pickColumnValue(row, ['분류']);
      const parts = [pointNo, pointType, category].filter(Boolean);
      if (parts.length > 0) {
        name = parts.join('_');
      }
    }

    // 2. 위도/경도 추출
    const latRaw = pickColumnValue(row, ['위도', 'lat', 'latitude', 'LAT']);
    const lngRaw = pickColumnValue(row, ['경도', 'lng', 'lon', 'longitude', 'LNG', 'LON']);

    const lat = parseCoordinate(latRaw);
    const lng = parseCoordinate(lngRaw);

    // 완전히 비어 있는 행은 건너뜁니다.
    if (!name && lat === null && lng === null) {
      return;
    }

    // 3. 유효성 검증 (이름 유무 및 위/경도 범위 확인)
    const reasons = [];
    if (!name) {
      reasons.push('번호_유형_관리(이름) 값이 비어 있음');
    }
    if (lat === null || lat < -90 || lat > 90 || lat === 0) {
      reasons.push(`위도 값이 올바르지 않음 (${latRaw || '빈값'})`);
    }
    if (lng === null || lng < -180 || lng > 180 || lng === 0) {
      reasons.push(`경도 값이 올바르지 않음 (${lngRaw || '빈값'})`);
    }

    if (reasons.length > 0) {
      invalidItems.push({
        rowNumber: excelRowNumber,
        name: name || '(이름 없음)',
        lat: latRaw,
        lng: lngRaw,
        reason: reasons.join(', ')
      });
      return;
    }

    validItems.push({
      index: validItems.length + 1,
      rowNumber: excelRowNumber,
      name,
      lat,
      lng,
      pointNo: pickColumnValue(row, ['표본점번호']),
      pointType: pickColumnValue(row, ['표본점유형']),
      category: pickColumnValue(row, ['분류'])
    });
  });

  if (validItems.length === 0 && invalidItems.length === 0) {
    throw new Error('유효한 데이터를 찾을 수 없습니다. 열 이름(번호_유형_관리, 위도, 경도)을 확인해 주세요.');
  }

  return {
    fileName: originalName,
    sheetName: firstSheetName,
    totalCount: validItems.length + invalidItems.length,
    validCount: validItems.length,
    invalidCount: invalidItems.length,
    validItems,
    invalidItems
  };
}

module.exports = {
  parseExcelBuffer
};

