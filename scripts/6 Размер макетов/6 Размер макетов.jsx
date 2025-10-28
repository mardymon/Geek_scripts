/**
 * Put "W × H мм" centered under each selected vector outline without fill.
 * Integers only (no decimals).
 */
(function () {
  if (app.documents.length === 0) { alert("Откройте документ и выделите объекты."); return; }
  var doc = app.activeDocument;
  if (!doc.selection || doc.selection.length === 0) { alert("Нужно выделить объекты."); return; }

  // ===== Настройки =====
  var OFFSET_PT = 30;      // отступ вниз, pt
  var FONT_SIZE = 12;      // размер шрифта
  var MM_PER_PT = 25.4 / 72;

  // Сбор целевых элементов
  var targets = [];
  for (var i = 0; i < doc.selection.length; i++) collectEligible(doc.selection[i], targets);
  if (targets.length === 0) { alert("Не найдено векторных контуров без заливки."); return; }

  for (var t = 0; t < targets.length; t++) {
    try { placeSizeLabel(targets[t]); } catch (e) {}
  }

  // ===== Helpers =====
  function collectEligible(item, outArr) {
    if (!item || item.locked || item.hidden) return;
    var tn = item.typename;

    if (tn === "PathItem") { if (isEligiblePath(item)) outArr.push(item); return; }

    if (tn === "CompoundPathItem") {
      if (compoundIsClipping(item)) return;
      for (var i = 0; i < item.pathItems.length; i++) {
        if (isEligiblePath(item.pathItems[i])) { outArr.push(item); break; }
      }
      return;
    }

    if (tn === "GroupItem") {
      for (var j = 0; j < item.pageItems.length; j++) collectEligible(item.pageItems[j], outArr);
      return;
    }
  }

  function compoundIsClipping(comp) {
    for (var i = 0; i < comp.pathItems.length; i++) if (comp.pathItems[i].clipping) return true;
    return false;
  }

  function isEligiblePath(p) {
    if (p.clipping || p.guides || p.locked || p.hidden) return false;
    if (p.filled) return false; // только без заливки
    return true;
  }

  function mmIntFromPt(pt) { return Math.round(pt * MM_PER_PT); }

  function placeSizeLabel(item) {
    var gb = item.geometricBounds; // [L, T, R, B]
    var left = gb[0], top = gb[1], right = gb[2], bottom = gb[3];
    var wPt = right - left;
    var hPt = top - bottom;

    var wMM = mmIntFromPt(wPt);
    var hMM = mmIntFromPt(hPt);

    var textStr = wMM + " × " + hMM + " мм";

    var cx = (left + right) / 2;
    var y = bottom - OFFSET_PT;

    var tf = item.layer.textFrames.add();
    tf.contents = textStr;
    tf.kind = TextType.POINTTEXT;
    tf.textRange.characterAttributes.size = FONT_SIZE;
    tf.position = [cx, y];

    var tgb = tf.geometricBounds;
    var tw = tgb[2] - tgb[0];
    tf.position = [cx - tw / 2, y];
  }
})();
