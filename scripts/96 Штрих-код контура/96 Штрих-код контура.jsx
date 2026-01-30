/* ExportDXF_SelectedOnly_BarcodeLeft.jsx
   — Экспорт DXF ТОЛЬКО ВЫДЕЛЕННЫХ объектов (аналог галочки в диалоге)
   — Без сохранения AI
   — Code-128C (стандартный Code 128) с адекватными размерами модулей и quiet-зонами
   — Размещение штрих-кода: слева от выделенного (по центру по вертикали)
*/
(function () {
  if (app.documents.length === 0) { alert("Нет открытого документа."); return; }
  var doc = app.activeDocument;

  // === НАСТРОЙКИ ШТРИХ-КОДА ===
  // Более типичные настройки под сканер:
  var MODULE_MIN_MM   = 0.30; // 1 модуль ≈ 0.3 мм (узкая полоса)
  var BAR_HEIGHT_MM   = 10;   // высота штрихов
  var QUIET_MM        = 3.00; // тихие зоны по 3 мм с каждой стороны
  var BAR_OVERSCAN_MM = 0.00; // без утолщения баров, чтобы не "забивать" зазоры
  var ID_DIGITS       = 10;   // чётное число цифр
  var MAP_CSV_NAME    = "_barcode_map.csv";
  var GAP_MM_LEFT     = 3.00; // (устар.) было: зазор слева от выделенного
  var OFFSET_MM_RIGHT = 29.10; // отступ ВПРАВО от правого края выделения
  var COPY_STEP_MM    = 300.00; // шаг между штрих-кодами по X
  var EXTRA_COPIES    = 4; // сколько ДОПОЛНИТЕЛЬНЫХ копий создать (итого будет 5)

  // === ПРОВЕРЯЕМ ВЫДЕЛЕНИЕ ===
  if (!doc.selection || doc.selection.length === 0) {
    alert("Ничего не выделено. Выделите объект(ы), которые нужно экспортировать в DXF.");
    return;
  }

  // === СПРАШИВАЕМ КУДА СОХРАНИТЬ DXF ===
  var dxfFile = pickDXFFile();
  if (!dxfFile) { alert("Сохранение отменено."); return; }

  // === ЭКСПОРТ DXF ТОЛЬКО ВЫДЕЛЕННОГО ===
  exportSelectedToDXF(doc, dxfFile); // << ВАЖНО: только выделение!

  var fullPath = File(dxfFile).fsName;

  // === ГЕНЕРИМ ЧИСЛОВОЙ ID + ПИШЕМ КАРТУ ===
  var numericId = makeNumericId(fullPath, ID_DIGITS);
  appendMapCSV(new File(dxfFile.path + "/" + MAP_CSV_NAME), numericId, fullPath);

  // === СТРОИМ ШТРИХ-КОД (после экспорта, чтобы не попал в DXF) ===
  // Это CODE 128 C (подтип C), но любой сканер видит его просто как "Code 128".
  var seq = code128CEncode(numericId);

  var mm = 2.834645669; // 1 мм ≈ 2.8346 pt
  var moduleWpt = MODULE_MIN_MM * mm;
  var barHpt    = BAR_HEIGHT_MM   * mm;
  var overPt    = BAR_OVERSCAN_MM * mm;
  var quietModules = Math.max(1, Math.round(QUIET_MM / MODULE_MIN_MM));

  var totalModules = quietModules * 2;
  for (var i = 0; i < seq.length; i++) totalModules += seq[i];

  var totalWpt = totalModules * moduleWpt;
  var totalWmm = totalWpt / mm;

  var grp = doc.groupItems.add();
  grp.name = "CODE128C_ID_" + numericId;

  // белый фон под штрих-код
  var bg = grp.pathItems.rectangle(0, 0, totalWpt, barHpt);
  bg.stroked = false;
  bg.filled  = true;
  bg.fillColor = rgb(255, 255, 255);

  // рисуем бары
  var x = quietModules * moduleWpt;
  for (var j = 0; j < seq.length; j++) {
    var w = seq[j] * moduleWpt;
    if (j % 2 === 0) { // чётные индексы — чёрные полосы
      var xBar = x - overPt / 2;
      var wBar = w + overPt;
      if (xBar < 0) { wBar += xBar; xBar = 0; }
      var bar = grp.pathItems.rectangle(0, xBar, Math.max(0, wBar), barHpt);
      bar.stroked = false;
      bar.filled  = true;
      bar.fillColor = rgb(0, 0, 0);
    }
    x += w;
  }

  // === ПОЗИЦИОНИРОВАНИЕ: справа от выделенного по верхнему краю + 4 копии (итого 5) ===
  app.redraw();
  var gapPt = GAP_MM_LEFT * mm; // legacy
  var offsetPt = OFFSET_MM_RIGHT * mm;
  var stepPt   = COPY_STEP_MM * mm;
  var placed = false;

  var b = getSelectionBounds(doc.selection); // [L,T,R,B]
  if (b) {
    var selRight = b[2], selTop = b[1];
    var codeW = grp.width;
    var newLeft = selRight + offsetPt;
    var newTop  = selTop - 2; // выравниваем по верхнему краю выделения
    grp.position = [newLeft, newTop];

    // === ЕЩЁ 4 КОПИИ НА ТОМ ЖЕ УРОВНЕ, ШАГ 267 мм ===
    for (var i = 1; i <= EXTRA_COPIES; i++) {
      var dup = grp.duplicate();
      dup.position = [newLeft + (i * stepPt), newTop];
    }

    placed = true;
  }

  if (!placed) {
    var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
    var r = ab.artboardRect, pad = 3 * mm;
    grp.position = [r[2] - pad - grp.width, r[1] - pad];
    // если нет выделения — тоже делаем 4 копии справа
    var baseLeft = grp.position[0];
    var baseTop  = grp.position[1];
    for (var j = 1; j <= EXTRA_COPIES; j++) {
      var dup2 = grp.duplicate();
      dup2.position = [baseLeft + (j * stepPt), baseTop];
    }
  }

  //alert(
    //"DXF сохранён (ТОЛЬКО выделенное).\n" +
    //"ID: " + numericId + "\n" +
    //"Ширина кода ≈ " + totalWmm.toFixed(1) + " мм; quiet по " + QUIET_MM + " мм."
  

  // ===== ВСПОМОГАТЕЛЬНЫЕ =====
  function pickDXFFile() {
    var f = File.saveDialog("Сохранить контур как DXF (только выделенное)", "*.dxf");
    if (!f) return null;
    var p = f.fsName;
    if (!/\.dxf$/i.test(p)) p += ".dxf";
    return new File(p);
  }

  // КЛЮЧ: экспорт ТОЛЬКО выделения
  function exportSelectedToDXF(d, f) {
    var o = new ExportOptionsAutoCAD();
    o.exportFileFormat = AutoCADExportFileFormat.DXF;
    o.version = AutoCADCompatibility.AutoCADRelease15; // R2000
    o.unit = AutoCADUnit.Millimeters;
    o.exportSelectedArtOnly = true;   // <<< аналог галочки «Только выделенные объекты»
    o.preserveAppearance   = false;
    d.exportFile(f, ExportType.AUTOCAD, o);
  }

  function rgb(r, g, b) {
    var c = new RGBColor();
    c.red   = r;
    c.green = g;
    c.blue  = b;
    return c;
  }

  function getSelectionBounds(sel) {
    var L = +Infinity, T = -Infinity, R = -Infinity, B = +Infinity;
    for (var i = 0; i < sel.length; i++) {
      var it = sel[i];
      var vb = it.visibleBounds || it.geometricBounds;
      if (!vb) continue;
      if (vb[0] < L) L = vb[0];
      if (vb[1] > T) T = vb[1];
      if (vb[2] > R) R = vb[2];
      if (vb[3] < B) B = vb[3];
    }
    if (!isFinite(L) || !isFinite(T) || !isFinite(R) || !isFinite(B)) return null;
    return [L, T, R, B];
  }

  // ID из CRC32 → десятичная строка чётной длины
  function makeNumericId(s, d) {
    var crc = crc32(s) >>> 0;
    var base = ("" + crc);
    while (base.length < d) base = "0" + base;
    if (base.length % 2) base = "0" + base;
    if (base.length > d) base = base.slice(-d);
    return base;
  }

  function appendMapCSV(csvFile, id, path) {
    var headerNeeded = !csvFile.exists;
    csvFile.encoding = "UTF-8";
    csvFile.lineFeed = "Unix";
    csvFile.open("a");
    if (headerNeeded) csvFile.write("id,path\n");
    var safePath = '"' + ("" + path).replace(/"/g, '""') + '"';
    csvFile.write(id + "," + safePath + "\n");
    csvFile.close();
  }

  // Code128C
  function getCode128Patterns() {
    return [
      [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],
      [2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],
      [2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],
      [3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],
      [1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
      [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],
      [3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],
      [1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],
      [1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],
      [1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
      [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],
      [1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1],
      [2,1,4,1,1,2], // 104 START B
      [2,1,1,1,4,2], // 105 START C
      [2,3,1,1,1,2]  // 106 STOP
    ];
  }

  function code128CEncode(digits) {
    var CODES = getCode128Patterns(), START_C = 105, STOP = 106;
    if (digits.length % 2) digits = "0" + digits;
    var vals = [START_C];
    for (var i = 0; i < digits.length; i += 2) {
      var v = parseInt(digits.substr(i, 2), 10);
      if (isNaN(v) || v < 0 || v > 99) v = 0;
      vals.push(v);
    }
    var sum = START_C;
    for (var j = 1; j < vals.length; j++) sum += vals[j] * j;
    var chk = sum % 103;
    vals.push(chk);
    vals.push(STOP);
    var seq = [];
    for (var k = 0; k < vals.length; k++) {
      var patt = CODES[vals[k]];
      for (var p = 0; p < 6; p++) seq.push(patt[p]);
    }
    // завершающий бар для STOP
    seq.push(2);
    return seq;
  }

  function crc32(str) {
    var table = crc32.table || (crc32.table = (function () {
      var c, t = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++)
          c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        t[n] = c >>> 0;
      }
      return t;
    })());
    var crc = 0 ^ (-1);
    for (var i = 0; i < str.length; i++) {
      var y = (crc ^ str.charCodeAt(i)) & 0xFF;
      crc = (crc >>> 8) ^ table[y];
    }
    return (crc ^ (-1)) >>> 0;
  }
})();
