#target illustrator
(function() {
    // === Параметры ===
    var stepMM     = 20,  // размер корзины в мм
        gapMM      = 10,  // отступ между объектами и строками в мм
        maxPerLine = 10;  // макс. объектов в одном ряду

    // Перевод мм ↔ пункты
    function mmToPt(mm) { return mm * 72 / 25.4; }
    function ptToMm(pt) { return pt * 25.4 / 72; }

    var stepPt = mmToPt(stepMM),
        gapPt  = mmToPt(gapMM);

    var doc = app.activeDocument;
    if (!doc || !doc.selection.length) {
        alert("Выберите встроенные растровые объекты (RasterItem).");
        return;
    }

    // Собираем только RasterItem
    var items = [];
    for (var i = 0; i < doc.selection.length; i++) {
        var o = doc.selection[i];
        if (o.typename === "RasterItem") {
            items.push(o);
        }
    }
    if (!items.length) {
        alert("В выделении нет ни одного RasterItem.");
        return;
    }

    // Находим левый‑верхний угол стартовой позиции
    var minX = Infinity, maxY = -Infinity;
    for (i = 0; i < items.length; i++) {
        var b = items[i].visibleBounds; // [left, top, right, bottom]
        if (b[0] < minX) minX = b[0];
        if (b[1] > maxY) maxY = b[1];
    }

    // Определяем для каждого объекта номер корзины:
    // idx = ceil(max(ширина,высота)/step) - 1
    var buckets = {};
    var maxBucket = 0;
    for (i = 0; i < items.length; i++) {
        var it   = items[i],
            bb   = it.visibleBounds,
            wPt  = bb[2] - bb[0],
            hPt  = bb[1] - bb[3],
            maxD = Math.max(wPt, hPt),
            idx  = Math.max(0, Math.ceil(ptToMm(maxD) / stepMM) - 1);

        if (!buckets[idx]) buckets[idx] = [];
        buckets[idx].push(it);
        if (idx > maxBucket) maxBucket = idx;
    }

    // Функция раскладки одной корзины (с переносом по maxPerLine)
    var currentYOffset = 0;
    function layoutBucket(groupIdx) {
        var group = buckets[groupIdx];
        if (!group || !group.length) return;

        // Вычисляем высоту ряда (макс. высота в группе)
        var rowH = 0;
        for (var j = 0; j < group.length; j++) {
            var h = group[j].visibleBounds[1] - group[j].visibleBounds[3];
            if (h > rowH) rowH = h;
        }

        // Сколько строк займёт эта корзина
        var rowsCount = Math.ceil(group.length / maxPerLine);

        for (var row = 0; row < rowsCount; row++) {
            var y = maxY - (currentYOffset + row * (rowH + gapPt));
            var x = minX;

            var start = row * maxPerLine;
            var end   = Math.min(start + maxPerLine, group.length);
            for (var k = start; k < end; k++) {
                var itm = group[k],
                    bb  = itm.visibleBounds,
                    wPt = bb[2] - bb[0];
                // ставим левый‑верхний угол
                itm.position = [ x, y ];
                x += wPt + gapPt;
            }
        }

        // смещаем на все строки этой корзины
        currentYOffset += rowsCount * (rowH + gapPt);
    }

    // Раскладываем корзины одну за другой
    for (var bi = 0; bi <= maxBucket; bi++) {
        layoutBucket(bi);
    }

    alert("Готово! Объекты разложены по корзинам " +
          "(0–" + stepMM + " мм, " +
          stepMM + "–" + (stepMM*2) + " мм …) " +
          "с максимум " + maxPerLine + " шт. в строке.");
})();
