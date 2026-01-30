/* ExportDXF_SelectedOnly_BarcodeLeft.jsx
   — Экспорт DXF ТОЛЬКО ВЫДЕЛЕННЫХ объектов
   — Без сохранения AI
   — Code-128C
   — Количество штрих-кодов задаётся пользователем (по умолчанию 1)
*/
(function () {
  if (app.documents.length === 0) { alert("Нет открытого документа."); return; }
  var doc = app.activeDocument;

  // === НАСТРОЙКИ ШТРИХ-КОДА ===
  var MODULE_MIN_MM   = 0.30;
  var BAR_HEIGHT_MM   = 10;
  var QUIET_MM        = 3.00;
  var BAR_OVERSCAN_MM = 0.00;
  var ID_DIGITS       = 10;
  var MAP_CSV_NAME    = "_barcode_map.csv";
  var GAP_MM_LEFT     = 3.00; // legacy
  var OFFSET_MM_RIGHT = 29.10;
  var COPY_STEP_MM    = 300.00;

  // === ПРОВЕРКА ВЫДЕЛЕНИЯ ===
  if (!doc.selection || doc.selection.length === 0) {
    alert("Ничего не выделено. Выделите объект(ы).");
    return;
  }

  // === КУДА СОХРАНИТЬ DXF ===
  var dxfFile = pickDXFFile();
  if (!dxfFile) { alert("Сохранение отменено."); return; }

  // === ЭКСПОРТ DXF (ТОЛЬКО ВЫДЕЛЕННОЕ) ===
  exportSelectedToDXF(doc, dxfFile);

  var fullPath = File(dxfFile).fsName;

  // === СПРАШИВАЕМ КОЛИЧЕСТВО ШТРИХ-КОДОВ ===
  var totalCopies = askBarcodeCount();
  if (totalCopies < 1) totalCopies = 1;

  // === ID + CSV ===
  var numericId = makeNumericId(fullPath, ID_DIGITS);
  appendMapCSV(new File(dxfFile.path + "/" + MAP_CSV_NAME), numericId, fullPath);

  // === СТРОИМ ШТРИХ-КОД ===
  var seq = code128CEncode(numericId);

  var mm = 2.834645669;
  var moduleWpt = MODULE_MIN_MM * mm;
  var barHpt    = BAR_HEIGHT_MM * mm;
  var overPt    = BAR_OVERSCAN_MM * mm;
  var quietModules = Math.max(1, Math.round(QUIET_MM / MODULE_MIN_MM));

  var totalModules = quietModules * 2;
  for (var i = 0; i < seq.length; i++) totalModules += seq[i];

  var grp = doc.groupItems.add();
  grp.name = "CODE128C_ID_" + numericId;

  // фон
  var bg = grp.pathItems.rectangle(0, 0, totalModules * moduleWpt, barHpt);
  bg.stroked = false;
  bg.filled  = true;
  bg.fillColor = rgb(255, 255, 255);

  // бары
  var x = quietModules * moduleWpt;
  for (var j = 0; j < seq.length; j++) {
    var w = seq[j] * moduleWpt;
    if (j % 2 === 0) {
      var bar = grp.pathItems.rectangle(0, x - overPt / 2, w + overPt, barHpt);
      bar.stroked = false;
      bar.filled  = true;
      bar.fillColor = rgb(0, 0, 0);
    }
    x += w;
  }

  // === ПОЗИЦИОНИРОВАНИЕ И КОПИИ ===
  app.redraw();
  var offsetPt = OFFSET_MM_RIGHT * mm;
  var stepPt   = COPY_STEP_MM * mm;
  var placed = false;

  var b = getSelectionBounds(doc.selection);
  if (b) {
    var newLeft = b[2] + offsetPt;
    var newTop  = b[1] - 2;
    grp.position = [newLeft, newTop];

    for (var k = 1; k < totalCopies; k++) {
      var dup = grp.duplicate();
      dup.position = [newLeft + (k * stepPt), newTop];
    }
    placed = true;
  }

  if (!placed) {
    var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
    var r = ab.artboardRect, pad = 3 * mm;
    grp.position = [r[2] - pad - grp.width, r[1] - pad];

    var baseLeft = grp.position[0];
    var baseTop  = grp.position[1];
    for (var m = 1; m < totalCopies; m++) {
      var dup2 = grp.duplicate();
      dup2.position = [baseLeft + (m * stepPt), baseTop];
    }
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ =====

  function askBarcodeCount() {
    var w = new Window("dialog", "Количество штрих-кодов");
    w.add("statictext", undefined, "Сколько штрих-кодов разместить?");
    var e = w.add("edittext", undefined, "1");
    e.characters = 6;
    e.active = true;

    var g = w.add("group");
    g.alignment = "right";
    g.add("button", undefined, "OK", { name: "ok" });
    g.add("button", undefined, "Отмена", { name: "cancel" });

    if (w.show() !== 1) return 1;
    var n = parseInt(e.text, 10);
    return (isNaN(n) || n < 1) ? 1 : n;
  }

  function pickDXFFile() {
    var f = File.saveDialog("Сохранить DXF", "*.dxf");
    if (!f) return null;
    if (!/\.dxf$/i.test(f.fsName)) f = new File(f.fsName + ".dxf");
    return f;
  }

  function exportSelectedToDXF(d, f) {
    var o = new ExportOptionsAutoCAD();
    o.exportFileFormat = AutoCADExportFileFormat.DXF;
    o.version = AutoCADCompatibility.AutoCADRelease15;
    o.unit = AutoCADUnit.Millimeters;
    o.exportSelectedArtOnly = true;
    o.preserveAppearance = false;
    d.exportFile(f, ExportType.AUTOCAD, o);
  }

  function rgb(r, g, b) {
    var c = new RGBColor();
    c.red = r; c.green = g; c.blue = b;
    return c;
  }

  function getSelectionBounds(sel) {
    var L = +Infinity, T = -Infinity, R = -Infinity, B = +Infinity;
    for (var i = 0; i < sel.length; i++) {
      var vb = sel[i].visibleBounds || sel[i].geometricBounds;
      if (!vb) continue;
      L = Math.min(L, vb[0]);
      T = Math.max(T, vb[1]);
      R = Math.max(R, vb[2]);
      B = Math.min(B, vb[3]);
    }
    return isFinite(L) ? [L, T, R, B] : null;
  }

  function makeNumericId(s, d) {
    var crc = crc32(s) >>> 0;
    var base = ("" + crc);
    while (base.length < d) base = "0" + base;
    if (base.length % 2) base = "0" + base;
    return base.slice(-d);
  }

  function appendMapCSV(csvFile, id, path) {
    var headerNeeded = !csvFile.exists;
    csvFile.open("a");
    if (headerNeeded) csvFile.write("id,path\n");
    csvFile.write(id + ",\"" + path.replace(/"/g, '""') + "\"\n");
    csvFile.close();
  }

  function code128CEncode(digits) {
    var C = getCode128Patterns(), START = 105, STOP = 106;
    if (digits.length % 2) digits = "0" + digits;
    var v = [START];
    for (var i = 0; i < digits.length; i += 2)
      v.push(parseInt(digits.substr(i, 2), 10) || 0);
    var sum = START;
    for (var j = 1; j < v.length; j++) sum += v[j] * j;
    v.push(sum % 103, STOP);

    var seq = [];
    for (var k = 0; k < v.length; k++)
      seq = seq.concat(C[v[k]]);
    seq.push(2);
    return seq;
  }

  function getCode128Patterns() {
    return [
      [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],
      [1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],
      [1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],
      [1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],
      [1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
      [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],
      [3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],
      [3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],
      [2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],
      [1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
      [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],
      [1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],
      [3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],
      [2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],
      [3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
      [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],
      [1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],
      [1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],
      [1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],
      [2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
      [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],
      [1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],
      [4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],
      [1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],
      [1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
      [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],
      [2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1],[2,1,4,1,1,2],
      [2,1,1,1,4,2],[2,3,1,1,1,2]
    ];
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
    for (var i = 0; i < str.length; i++)
      crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xFF];
    return (crc ^ (-1)) >>> 0;
  }

})();
