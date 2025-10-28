/**
 * ResizeRaster_ByOneDimension.jsx (фикс без String.trim)
 * Масштабирует выделенные Raster/Placed до заданной ШИРИНЫ или ВЫСОТЫ (вводим ровно одно поле).
 * Пропорции сохраняются, масштаб относительно центра.
 * Единицы: mm, cm, in, px, pt.
 */

(function () {
    if (app.documents.length === 0) { alert("Нет открытых документов."); return; }
    var doc = app.activeDocument;
    if (!doc.selection || doc.selection.length === 0) { alert("Ничего не выделено."); return; }

    // --- helpers ---
    function strTrim(s) { return String(s).replace(/^\s+|\s+$/g, ""); } // полифилл trim
    function toPt(v, u) {
        switch ((u||"").toLowerCase()) {
            case "pt": return v;
            case "px": return v; // 1px ~ 1pt в Иллюстраторе
            case "in": return v * 72.0;
            case "mm": return v * (72.0 / 25.4);
            case "cm": return v * (72.0 / 2.54);
            default: return NaN;
        }
    }
// ЗАМЕНИТЕ старую getSizePts на эту версию
function getSizePts(pageItem) {
    // Для RasterItem / PlacedItem свойства width/height надёжнее, чем geometricBounds
    // (учитывают повороты и не путают порядок координат).
    var w = Math.abs(pageItem.width);
    var h = Math.abs(pageItem.height);
    // На всякий случай fallback, если вдруг пришли нули
    if (!(w > 0 && h > 0) && pageItem.geometricBounds && pageItem.geometricBounds.length === 4) {
        var gb = pageItem.geometricBounds; // порядок в AI бывает разный
        // Пытаемся вычислить обе оси и взять положительные
        var cand1 = Math.abs(gb[3] - gb[1]); // right - left
        var cand2 = Math.abs(gb[2] - gb[0]); // bottom - top
        // Выбираем, что больше похоже на ширину/высоту
        w = w > 0 ? w : cand1;
        h = h > 0 ? h : cand2;
    }
    return { width: w, height: h };
}

    // --- Диалог ---
    var dlg = new Window("dialog", "Подогнать растр по одной стороне");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var gInp = dlg.add("group");
    gInp.orientation = "row";
    gInp.alignChildren = "top";

    var leftCol = gInp.add("panel", undefined, "Размер");
    leftCol.orientation = "column"; leftCol.alignChildren = "left"; leftCol.margins = 10;

    var wGroup = leftCol.add("group"); wGroup.add("statictext", undefined, "Ширина:");
    var edW = wGroup.add("edittext", undefined, "");
    edW.characters = 10;

    var hGroup = leftCol.add("group"); hGroup.add("statictext", undefined, "Высота:");
    var edH = hGroup.add("edittext", undefined, "");
    edH.characters = 10;

    var unitCol = gInp.add("panel", undefined, "Единицы");
    unitCol.orientation = "column"; unitCol.alignChildren = "left"; unitCol.margins = 10;
    var ddUnits = unitCol.add("dropdownlist", undefined, ["mm","cm","in","px","pt"]);
    ddUnits.selection = 0; // mm по умолчанию

    var info = dlg.add("statictext", undefined,
        "Заполните РОВНО одно поле (ширина ИЛИ высота). Десятичный разделитель — запятая или точка.",
        {multiline:true});
    info.alignment = "left";

    var btns = dlg.add("group"); btns.alignment = "right";
    var okBtn = btns.add("button", undefined, "OK", {name:"ok"});
    btns.add("button", undefined, "Отмена", {name:"cancel"});

    okBtn.onClick = function () {
        var wStr = strTrim(String(edW.text || ""));
        var hStr = strTrim(String(edH.text || ""));

        // заменим все запятые на точки
        wStr = wStr.replace(/,/g, ".");
        hStr = hStr.replace(/,/g, ".");

        var hasW = wStr.length > 0;
        var hasH = hStr.length > 0;

        if ((hasW && hasH) || (!hasW && !hasH)) {
            alert("Нужно заполнить РОВНО одно поле: ширина ИЛИ высота.");
            return;
        }
        var val = parseFloat(hasW ? wStr : hStr);
        if (!isFinite(val) || val <= 0) {
            alert("Введите положительное число.");
            return;
        }
        dlg.close(1);
    };

    if (dlg.show() !== 1) return;

    // Собираем ввод
    var wStr = strTrim(String(edW.text || "")).replace(/,/g, ".");
    var hStr = strTrim(String(edH.text || "")).replace(/,/g, ".");
    var hasW = wStr.length > 0;
    var hasH = hStr.length > 0;

    var unit = (ddUnits.selection ? ddUnits.selection.text : "mm").toLowerCase();
    var targetWpt = hasW ? toPt(parseFloat(wStr), unit) : NaN;
    var targetHpt = hasH ? toPt(parseFloat(hStr), unit) : NaN;

    var items = []; for (var i=0; i<doc.selection.length; i++) items.push(doc.selection[i]);

    var processed = 0, skipped = 0;
    var anchor = Transformation.CENTER;

    for (var j=0; j<items.length; j++) {
        var it = items[j];
        if (!(it.typename === "RasterItem" || it.typename === "PlacedItem")) { skipped++; continue; }
        if (it.locked || it.hidden) { skipped++; continue; }

        var sz = getSizePts(it);
        if (!sz || sz.width <= 0 || sz.height <= 0) { skipped++; continue; }

        var useH = !isNaN(targetHpt);
        var target = useH ? targetHpt : targetWpt;
        var current = useH ? sz.height : sz.width;
        if (!isFinite(target) || target <= 0 || current <= 0) { skipped++; continue; }

        var scale = (target / current) * 100.0; // %
        try {
            it.resize(
                scale,  // X
                scale,  // Y
                true,   // changePositions
                true,   // changeFillPatterns
                true,   // changeFillGradients
                true,   // changeStrokePattern
                true,   // changeLineWidths
                anchor
            );
            processed++;
        } catch (e) {
            skipped++;
        }
    }

    alert("Готово.\nИзменено: " + processed + "\nПропущено: " + skipped);
})();
