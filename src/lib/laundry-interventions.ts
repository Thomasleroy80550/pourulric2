import * as XLSX from 'xlsx';

export type LaundryRoomMatchTarget = {
  id: string;
  roomName: string;
};

export type ParsedLaundryIntervention = {
  id: string;
  sheetName: string;
  rowNumber: number;
  rawRoomName: string;
  rawDate: string;
  rawValues: string[];
  matchedRoomId: string | null;
  enabled: boolean;
};

type HeaderDetection = {
  headerRowIndex: number;
  roomColumnIndex: number;
  dateColumnIndex: number | null;
  interColumnIndex: number | null;
};

const STOP_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'au', 'aux', 'et']);

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const stringifyCell = (value: unknown) => String(value ?? '').trim();

const toTokens = (value: string) =>
  normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const parseEnabledCell = (value: unknown) => {
  const normalized = normalizeText(String(value ?? ''));
  return ['1', 'true', 'vrai', 'oui', 'x'].includes(normalized);
};

const roomHeaderRegex = /(logement|chambres?|propriete|propriete(s)?|property|hebergement|hebergement(s)?|hébergement|hébergements)/i;
const dateHeaderRegex = /(date|check ?out|checkout|intervention|menage|ménage)/i;
const interHeaderRegex = /(inter|linge|a calculer|à calculer)/i;

const scoreRoomMatch = (rawText: string, roomName: string) => {
  const normalizedText = normalizeText(rawText);
  const normalizedRoom = normalizeText(roomName);

  if (!normalizedText || !normalizedRoom) return 0;
  if (normalizedText === normalizedRoom) return 100;
  if (normalizedText.includes(normalizedRoom)) return 95;
  if (normalizedRoom.includes(normalizedText) && normalizedText.length >= 5) return 88;

  const textTokens = toTokens(normalizedText);
  const roomTokens = toTokens(normalizedRoom);

  if (textTokens.length === 0 || roomTokens.length === 0) return 0;

  const commonTokenCount = roomTokens.filter((token) => textTokens.includes(token)).length;
  const overlapScore = commonTokenCount / roomTokens.length;

  if (overlapScore >= 1) return 90;
  if (overlapScore >= 0.75) return 82;
  if (overlapScore >= 0.5) return 72;

  return 0;
};

const findBestRoomMatch = (rawText: string, rooms: LaundryRoomMatchTarget[]) => {
  let bestMatch: { roomId: string | null; score: number } = { roomId: null, score: 0 };

  rooms.forEach((room) => {
    const score = scoreRoomMatch(rawText, room.roomName);
    if (score > bestMatch.score) {
      bestMatch = { roomId: room.id, score };
    }
  });

  return bestMatch.score >= 72 ? bestMatch.roomId : null;
};

const detectHeader = (rows: unknown[][]): HeaderDetection | null => {
  const rowsToInspect = rows.slice(0, 25);

  for (let rowIndex = 0; rowIndex < rowsToInspect.length; rowIndex += 1) {
    const row = rowsToInspect[rowIndex];
    const normalizedRow = row.map((cell) => normalizeText(String(cell ?? '')));

    const roomColumnIndex = normalizedRow.findIndex((cell) => roomHeaderRegex.test(cell));
    if (roomColumnIndex < 0) continue;

    const dateColumnIndex = normalizedRow.findIndex((cell) => dateHeaderRegex.test(cell));
    const interColumnIndex = normalizedRow.findIndex((cell) => interHeaderRegex.test(cell));

    return {
      headerRowIndex: rowIndex,
      roomColumnIndex,
      dateColumnIndex: dateColumnIndex >= 0 ? dateColumnIndex : null,
      interColumnIndex: interColumnIndex >= 0 ? interColumnIndex : null,
    };
  }

  return null;
};

export function parseLaundryInterventionsWorkbook(
  buffer: ArrayBuffer,
  rooms: LaundryRoomMatchTarget[],
): ParsedLaundryIntervention[] {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    raw: false,
    dense: false,
  });

  const parsedRows: ParsedLaundryIntervention[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    });

    const header = detectHeader(rows);

    if (header) {
      rows.slice(header.headerRowIndex + 1).forEach((row, relativeIndex) => {
        const rowNumber = header.headerRowIndex + relativeIndex + 2;
        const rawRoomName = stringifyCell(row[header.roomColumnIndex]);

        if (!rawRoomName) return;

        parsedRows.push({
          id: `${sheetName}-${rowNumber}`,
          sheetName,
          rowNumber,
          rawRoomName,
          rawDate: header.dateColumnIndex !== null ? stringifyCell(row[header.dateColumnIndex]) : '',
          rawValues: row.map(stringifyCell),
          matchedRoomId: findBestRoomMatch(rawRoomName, rooms),
          enabled: header.interColumnIndex !== null ? parseEnabledCell(row[header.interColumnIndex]) : true,
        });
      });

      return;
    }

    rows.forEach((row, rowIndex) => {
      let bestCellText = '';
      let bestRoomId: string | null = null;
      let bestScore = 0;

      row.forEach((cell) => {
        const cellText = stringifyCell(cell);
        if (!cellText) return;

        rooms.forEach((room) => {
          const score = scoreRoomMatch(cellText, room.roomName);
          if (score > bestScore) {
            bestScore = score;
            bestRoomId = room.id;
            bestCellText = cellText;
          }
        });
      });

      if (!bestRoomId || bestScore < 90) return;

      parsedRows.push({
        id: `${sheetName}-${rowIndex + 1}`,
        sheetName,
        rowNumber: rowIndex + 1,
        rawRoomName: bestCellText,
        rawDate: '',
        rawValues: row.map(stringifyCell),
        matchedRoomId: bestRoomId,
        enabled: true,
      });
    });
  });

  const uniqueRows = new Map<string, ParsedLaundryIntervention>();
  parsedRows.forEach((row) => {
    uniqueRows.set(row.id, row);
  });

  return Array.from(uniqueRows.values());
}
