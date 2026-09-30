    #target illustrator

(function () {
    var SCRIPT_NAME = "95 Разложить лист";

    try {
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
            if (doc.selection[i]) {
                baseItems.push(doc.selection[i]);
            }
        }

        if (baseItems.length === 0) {
            alert("Ничего не выделено. Выдели метки и обтравочные маски и запусти скрипт ещё раз.");
            return;
        }

        // -------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ --------

        // подняться до обтравочной маски, если объект внутри неё
        function getClipGroup(item) {
            var cur = item;

            if (!cur) return null;

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

        // Только собственная маска группы. Вложенные маски относятся к рисунку
        // и могут иметь другие центры; составную маску берём целиком.
        function getClipPath(item) {
            if (!item || item.typename !== "GroupItem" || !item.clipped) return null;
            for (var i = 0; i < item.pageItems.length; i++) {
                var child = item.pageItems[i];
                if (child.parent !== item) continue;
                if (child.typename === "PathItem" && child.clipping) return child;
                if (child.typename === "CompoundPathItem") {
                    for (var p = 0; p < child.pathItems.length; p++) {
                        if (child.pathItems[p].clipping) return child;
                    }
                }
            }
            return null;
        }

        // ключ позиции по центру КОНТУРА МАСКИ (если есть), иначе по самому объекту
        function getPositionKey(item) {
            if (!item) return null;

            var target = getClipPath(item);
            if (!target) {
                target = item;
            }

            var b;
            try {
                b = target.geometricBounds; // [l, t, r, b]
            } catch (e) {
                try {
                    b = target.visibleBounds;
                } catch (e2) {
                    return null;
                }
            }

            var cx = (b[0] + b[2]) / 2;
            var cy = (b[1] + b[3]) / 2;

            // грубое округление до 1 пункта, чтобы съесть микросдвиги
            var rx = Math.round(cx);
            var ry = Math.round(cy);

            return rx + "_" + ry;
        }

        // Границы контура маски: размер может отличаться, центр должен совпадать.
        function getMaskBounds(item) {
            var target = getClipPath(item);
            if (!target) return null;
            try {
                return target.geometricBounds;
            } catch (e) {
                try {
                    return target.visibleBounds;
                } catch (e2) {
                    return null;
                }
            }
        }

        function boundsOverlap(a, b) {
            if (!a || !b) return false;

            var left = Math.max(a[0], b[0]);
            var right = Math.min(a[2], b[2]);
            var top = Math.min(a[1], b[1]);
            var bottom = Math.max(a[3], b[3]);

            return right > left && top > bottom;
        }

        // Для одного макета учитываем только центр маски, независимо от её размера.
        function boundsBelongToSameLayout(a, b) {
            if (!a || !b) return false;

            var acx = (a[0] + a[2]) / 2;
            var acy = (a[1] + a[3]) / 2;
            var bcx = (b[0] + b[2]) / 2;
            var bcy = (b[1] + b[3]) / 2;

            var CENTER_TOLERANCE = 0.1 * MM; // только погрешность центрирования, 0,1 мм

            return Math.abs(acx - bcx) <= CENTER_TOLERANCE &&
                   Math.abs(acy - bcy) <= CENTER_TOLERANCE;
        }

        // -------- РАЗДЕЛЯЕМ МЕТКИ И СЛОИ --------

        var marks = [];
        var layerItems = [];

        for (var bi = 0; bi < baseItems.length; bi++) {
            var it = baseItems[bi];
            if (!it) continue;

            var clip = getClipGroup(it);

            if (clip) {
                if (!inArray(layerItems, clip)) {
                    layerItems.push(clip);
                }
            } else {
                // всё, что не обтравка – считаем метками
                marks.push(it);
            }
        }

        if (layerItems.length === 0) {
            alert("В выделении нет обтравочных масок (слоёв).");
            return;
        }

        // -------- ГРУППИРУЕМ СЛОИ ПО ПОЗИЦИЯМ --------

        // Объединяем по центру маски независимо от размера и пересечения областей.
        var stacks = [];

        for (var j = 0; j < layerItems.length; j++) {
            var item = layerItems[j];
            if (!item) continue;

            var itemBounds = getMaskBounds(item);
            if (!itemBounds) {
                alert("Не удалось определить собственный контур маски одного из слоёв. Раскладка отменена, исходные объекты сохранены.");
                return;
            }
            var placed = false;

            for (var st = 0; st < stacks.length; st++) {
                // Фиксированный центр первой маски исключает объединение цепочкой.
                if (boundsBelongToSameLayout(itemBounds, stacks[st].referenceBounds)) {
                    stacks[st].items.push(item);
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                stacks.push({
                    items: [item],
                    referenceBounds: itemBounds
                });
            }
        }

        var maxDepth = 0;

        for (var si = 0; si < stacks.length; si++) {
            var stack = stacks[si];

            // сортируем по zOrderPosition сверху вниз
            stack.items.sort(function (a, b) {
                try {
                    return a.zOrderPosition - b.zOrderPosition;
                } catch (e) {
                    return 0;
                }
            });

            if (stack.items.length > maxDepth) maxDepth = stack.items.length;
        }

        if (stacks.length === 0 || maxDepth === 0) {
            alert("Не удалось определить слои для раскладки.");
            return;
        }

        // -------- СОЗДАЁМ ЛИСТЫ --------

        // чистим выделение во время работы, чтобы уменьшить шанс глюков
        doc.selection = null;

        for (var layerIndex = 0; layerIndex < maxDepth; layerIndex++) {

            var offsetX = OFFSET * (layerIndex + 1);

            // Метки
            for (var m = 0; m < marks.length; m++) {
                var mark = marks[m];
                if (!mark) continue;
                try {
                    var mDup = mark.duplicate();
                    mDup.translate(offsetX, 0);
                } catch (eMark) {}
            }

            // Слои по позициям
            for (var s = 0; s < stacks.length; s++) {
                var arr = stacks[s].items;
                var n = arr.length;
                if (n === 0) continue;

                // Пропорциональное распределение с сохранением порядка слоёв:
                // 2 на 4: [1, 1, 2, 2]; 2 на 3: [1, 2, 2].
                var layerNumber = Math.ceil((layerIndex + 1) * n / maxDepth) - 1;
                var idx = n - 1 - layerNumber;

                var src = arr[idx];
                if (!src) continue;

                try {
                    var dup = src.duplicate();
                    dup.translate(offsetX, 0);
                } catch (eLayer) {}
            }
        }

        // Удаляем исходное «слоёное» выделение
        for (var k = 0; k < baseItems.length; k++) {
            var bItem = baseItems[k];
            if (!bItem) continue;
            try {
                bItem.remove();
            } catch (eRem) {}
        }

        // На всякий случай чистим выделение в конце
        doc.selection = null;

    } catch (err) {
        alert(
            "Скрипт \"" + SCRIPT_NAME + "\" остановился с ошибкой:\n" +
            err + (err.line ? ("\nСтрока: " + err.line) : "")
        );
    }
})();
