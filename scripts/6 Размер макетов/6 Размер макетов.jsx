/**
 * Put "W × H мм" centered under each selected vector outline without fill.
 * Integers only (no decimals).
 */
(function () {
  if (app.documents.length === 0) { alert("Откройте документ и выделите объекты."); return; }
  var doc = app.activeDocument;
  if (!doc.selection || doc.selection.length === 0) { alert("Нужно выделить объекты."); return; }

  // ===== Настройки =====
  var OFFSET_PT = 30;      // Теперь это значение будет учитываться
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
    if (p.filled) return false; 
    return true;
  }

  function mmIntFromPt(pt) { return Math.round(pt * MM_PER_PT); }

  function placeSizeLabel(item) {
    try {
        var gb = item.visibleBounds; 
        var left = gb[0], top = gb[1], right = gb[2], bottom = gb[3];
        
        if (left == 0 && top == 0 && right == 0 && bottom == 0) return;

        var wPt = right - left;
        var hPt = top - bottom;

        var centerX = left + (wPt / 2);
        
        // --- ИСПРАВЛЕНО ЗДЕСЬ ---
        var labelY = bottom - OFFSET_PT; 

        var labelText = mmIntFromPt(wPt) + " × " + mmIntFromPt(hPt) + " мм";
        var textItem = app.activeDocument.activeLayer.textFrames.add();
        textItem.contents = labelText;
        textItem.textRange.size = FONT_SIZE;
        
        textItem.left = centerX - (textItem.width / 2);
        textItem.top = labelY;

    } catch (e) {
        return;
    }
  }
})();