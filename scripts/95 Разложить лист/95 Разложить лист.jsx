#target illustrator

(function () {
    if (app.documents.length === 0) {
        alert("Открой документ с печатным листом.");
        return;
    }

    var doc = app.activeDocument;

    if (!doc.selection || doc.selection.length === 0) {
        alert("Выдели объекты для раскладки (метки + все обтравочные маски слоёв).");
        return;
    }

    // --- КОНСТАНТЫ ---
    var MM = 2.834645669291339; // 1 мм в пунктах
    var OFFSET_MM = 300;        // шаг раскладки вправо (мм)
    var OFFSET = OFFSET_MM * MM;

    // Сохраняем исходное выделение
    var baseItems = [];
    for (var i = 0; i < doc.selection.length; i++) {
        baseItems.push(doc.selection[i]);
    }

    // -------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ --------

    // подняться до обтравочной маски, если объект внутри неё
    function getClipGroup(item) {
        var cur = item;

        if (cur.typename === "GroupItem" && cur.clipped) {
            return cur;
        }

        while (cur && cur.parent && cur.parent.typename === "GroupItem") {
            if (cur.parent.clipped) {
                return cur.parent;
            }
            cur = cur.parent;
        }
        return null;
    }

    function inArray(arr, obj) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === obj) return true;
        }
        return false;
    }

    // РЕКУРСИВНЫЙ поиск контура маски внутри обтравочной группы
    function findClipPathRecursive(obj) {
        try {
            // у некоторых объектов есть свойство clipping
            if (obj.clipping) {
                return obj;
            }
        } catch (e) {}

        var i, children;

        if (obj.typename === "GroupItem" || obj.typename === "Layer") {
            children = obj.pageItems;
            for (i = 0; i < children.length; i++) {
                var res = findClipPathRecursive(children[i]);
                if (res) return res;
            }
        } else if (obj.typename === "CompoundPathItem") {
            children = obj.pathItems;
            for (i = 0; i < children.length; i++) {
                var res2 = findClipPathRecursive(children[i]);
                if (res2) return res2;
            }
        }

        return null;
    }

    // получаем контур маски внутри обтравочной группы
    function getClipPath(item) {
        if (item.typename === "GroupItem" && item.clipped) {
            return findClipPathRecursive(item);
        }
        return null;
    }

    // ключ позиции по центру КОНТУРА МАСКИ (если есть), иначе по самому объекту
    function getPositionKey(item) {
        var target = getClipPath(item);
        if (!target) {
            target = item;
        }

        var b;
        try {
            b = target.geometricBounds; // [l, t, r, b]
        } catch (e) {
            b = target.visibleBounds;
        }

        var cx = (b[0] + b[2]) / 2;
        var cy = (b[1] + b[3]) / 2;

        // грубое округление до 1 пункта, чтобы съесть микросдвиги
        var rx = Math.round(cx);
        var ry = Math.round(cy);

        return rx + "_" + ry;
    }

    // -------- РАЗДЕЛЯЕМ МЕТКИ И СЛОИ --------

    var marks = [];
    var layerItems = [];

    for (var i = 0; i < baseItems.length; i++) {
        var it = baseItems[i];

        var clip = getClipGroup(it);

        if (clip) {
            if (!inArray(layerItems, clip)) {
                layerItems.push(clip);
            }
            continue;
        }

        // ВСЁ, что не обтравка — считаем метками
        marks.push(it);
    }

    if (layerItems.length === 0) {
        alert("В выделении нет обтравочных масок (слоёв).");
        return;
    }

    // -------- ГРУППИРУЕМ СЛОИ ПО ПОЗИЦИЯМ --------

    var stacksMap = {};

    for (var j = 0; j < layerItems.length; j++) {
        var item = layerItems[j];
        var key = getPositionKey(item);

        if (!stacksMap[key]) {
            stacksMap[key] = { items: [] };
        }
        stacksMap[key].items.push(item);
    }

    var stacks = [];
    var maxDepth = 0;

    for (var key in stacksMap) {
        if (!stacksMap.hasOwnProperty(key)) continue;

        var stack = stacksMap[key];

        stack.items.sort(function (a, b) {
            return a.zOrderPosition - b.zOrderPosition;
        });

        if (stack.items.length > maxDepth) maxDepth = stack.items.length;
        stacks.push(stack);
    }

    if (maxDepth === 0) {
        alert("Не удалось определить слои.");
        return;
    }

    // -------- СОЗДАЁМ ЛИСТЫ --------

    for (var layerIndex = 0; layerIndex < maxDepth; layerIndex++) {

        var offsetX = OFFSET * (layerIndex + 1);

        // Метки
        for (var m = 0; m < marks.length; m++) {
            var mDup = marks[m].duplicate();
            mDup.translate(offsetX, 0);
        }

        // Слои по позициям
        for (var s = 0; s < stacks.length; s++) {
            var arr = stacks[s].items;
            var n = arr.length;

            var idx;
            if (layerIndex < n) {
                idx = n - 1 - layerIndex; // сверху вниз
            } else {
                idx = 0; // нижний, если слоёв меньше
            }

            var dup = arr[idx].duplicate();
            dup.translate(offsetX, 0);
        }
    }

    // Удаляем исходное «слоёное» выделение
    for (var k = 0; k < baseItems.length; k++) {
        try { baseItems[k].remove(); } catch (e) {}
    }
})();
