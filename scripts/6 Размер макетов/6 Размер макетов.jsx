/**
 * Put "W × H мм" centered under each selected vector outline without fill.
 * Size rounding: nearest 0.5 mm
 * Ignores stroke thickness
 */
(function () {

    if (app.documents.length === 0) {
        alert("Откройте документ и выделите объекты.");
        return;
    }

    var doc = app.activeDocument;

    if (!doc.selection || doc.selection.length === 0) {
        alert("Нужно выделить объекты.");
        return;
    }


    // ===== Настройки =====
    var OFFSET_PT = 30;      // расстояние от объекта
    var FONT_SIZE = 12;      // размер текста
    var MM_PER_PT = 25.4 / 72;


    // ===== Сбор объектов =====
    var targets = [];

    for (var i = 0; i < doc.selection.length; i++) {
        collectEligible(doc.selection[i], targets);
    }

    if (targets.length === 0) {
        alert("Не найдено векторных контуров без заливки.");
        return;
    }


    for (var t = 0; t < targets.length; t++) {
        try {
            placeSizeLabel(targets[t]);
        } catch (e) {}
    }



    // =========================
    //        FUNCTIONS
    // =========================


    function collectEligible(item, outArr) {

        if (!item || item.locked || item.hidden) return;

        var tn = item.typename;


        if (tn === "PathItem") {

            if (isEligiblePath(item)) {
                outArr.push(item);
            }

            return;
        }


        if (tn === "CompoundPathItem") {

            if (compoundIsClipping(item)) return;

            for (var i = 0; i < item.pathItems.length; i++) {

                if (isEligiblePath(item.pathItems[i])) {
                    outArr.push(item);
                    break;
                }

            }

            return;
        }


        if (tn === "GroupItem") {

            for (var j = 0; j < item.pageItems.length; j++) {

                collectEligible(item.pageItems[j], outArr);

            }

            return;
        }

    }



    function compoundIsClipping(comp) {

        for (var i = 0; i < comp.pathItems.length; i++) {

            if (comp.pathItems[i].clipping)
                return true;

        }

        return false;
    }



    function isEligiblePath(p) {

        if (p.clipping || p.guides || p.locked || p.hidden)
            return false;


        // Только контуры без заливки
        if (p.filled)
            return false;


        return true;
    }



    // ===== Округление до 0.5 мм =====

    function mmRound05FromPt(pt) {

        var mm = pt * MM_PER_PT;

        // убираем погрешности Illustrator
        mm = Math.round(mm * 1000) / 1000;

        // ближайшие 0.5 мм
        var result = Math.round(mm * 2) / 2;


        // убираем .0
        if (result % 1 === 0) {
            return String(result.toFixed(0));
        } else {
            return String(result.toFixed(1));
        }

    }



    function placeSizeLabel(item) {

        var gb = item.geometricBounds; 
        // НЕ учитывает Stroke

        var left = gb[0];
        var top = gb[1];
        var right = gb[2];
        var bottom = gb[3];


        if (left == 0 && top == 0 && right == 0 && bottom == 0)
            return;



        var wPt = right - left;
        var hPt = top - bottom;


        var centerX = left + (wPt / 2);


        // положение текста снизу
        var labelY = bottom - OFFSET_PT;



        var labelText =
            mmRound05FromPt(wPt) +
            " × " +
            mmRound05FromPt(hPt) +
            " мм";



        var textItem =
            app.activeDocument.activeLayer.textFrames.add();


        textItem.contents = labelText;

        textItem.textRange.size = FONT_SIZE;


        textItem.left =
            centerX - (textItem.width / 2);


        textItem.top = labelY;

    }


})();