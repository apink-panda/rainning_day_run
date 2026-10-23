/**
 * 水窪跳跳排行榜（Google Apps Script）
 * 綁定到一份 Google Sheet 後部署成網頁應用程式即可使用。
 * 工作表會在第一次讀寫時自動建立。
 */
var SCORE_SHEET = 'PandaRainScores';
var GAME_KEY = 'panda_rain';

function doGet(e) {
  try {
    return jsonOutput({ game: GAME_KEY, leaderboard: getLeaderboard() });
  } catch (error) {
    return jsonOutput({ game: GAME_KEY, error: String(error) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (String(body.game || '') !== GAME_KEY) throw new Error('Unsupported game');

    var handle = cleanText(body.handle, 28);
    var score = Math.floor(Number(body.score));
    var panda = cleanText(body.panda, 20) || 'enji';
    if (!handle) throw new Error('Missing handle');
    if (!isFinite(score) || score < 0 || score > 10000) throw new Error('Invalid score');

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      upsertHighScore(handle, score, panda);
    } finally {
      lock.releaseLock();
    }
    return jsonOutput({ game: GAME_KEY, leaderboard: getLeaderboard() });
  } catch (error) {
    return jsonOutput({ game: GAME_KEY, error: String(error) });
  }
}

function getLeaderboard() {
  var sheet = getScoreSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1)
    .map(function (row) {
      return { handle: String(row[0] || ''), score: Number(row[1]) || 0, panda: String(row[2] || 'enji') };
    })
    .filter(function (row) { return row.handle; })
    .sort(function (a, b) { return b.score - a.score; })
    .slice(0, 100);
}

function upsertHighScore(handle, score, panda) {
  var sheet = getScoreSheet();
  var values = sheet.getDataRange().getValues();
  var normalized = handle.toLowerCase();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim().toLowerCase() === normalized) {
      if (score > (Number(values[i][1]) || 0)) {
        sheet.getRange(i + 1, 2, 1, 3).setValues([[score, panda, new Date().toISOString()]]);
      }
      return;
    }
  }
  sheet.appendRow([handle, score, panda, new Date().toISOString()]);
}

function getScoreSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SCORE_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(SCORE_SHEET);
  if (sheet.getLastRow() === 0) sheet.appendRow(['handle', 'score', 'panda', 'updatedAt']);
  return sheet;
}

function cleanText(value, maxLength) {
  return String(value || '').replace(/[<>\u0000-\u001F]/g, '').trim().slice(0, maxLength);
}

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
