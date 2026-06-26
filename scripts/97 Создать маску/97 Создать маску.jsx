#target illustrator

(function () {
    if (app.documents.length === 0) {
        alert("Нет открытого документа.");
        return;
    }

    var doc = app.activeDocument;

    if (!doc.selection || doc.selection.length < 2) {
        alert("Выделите один векторный контур и одно или несколько изображений/групп.");
        return;
    }

    /*
        Если порядок пойдёт строго наоборот, поменяй true на false.
        Но сначала проверь так.
    */
    var PAGEITEMS_TOP_FIRST = true;

    function clearSelection() {
        doc.selection = null;
    }

    function isPathLike(item) {
        return item && (
            item.typename === "PathItem" ||
            item.typename === "CompoundPathItem"
        );
    }

    function isUsablePath(item) {
        if (!isPathLike(item)) return false;

        if (item.typename === "PathItem") {
            if (item.guides || item.hidden || item.locked) return false;
            if (!item.closed) return false;
            if (item.clipping) return false;
            return true;
        }

        if (item.typename === "CompoundPathItem") {
            if (item.hidden || item.locked) return false;
            return true;
        }

        return false;
    }

    function isImageLike(item) {
        return item && (
            item.typename === "PlacedItem" ||
            item.typename === "RasterItem"
        );
    }

    function addUnique(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) return;
        }
        arr.push(item);
    }

    function containsImage(item) {
        if (!item) return false;

        if (isImageLike(item)) return true;

        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                if (containsImage(item.pageItems[i])) return true;
            }
        }

        return false;
    }

    function scanPathsOnly(item, result) {
        if (!item) return;

        if (isUsablePath(item)) {
            addUnique(result.paths, item);
            return;
        }

        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                scanPathsOnly(item.pageItems[i], result);
            }
        }
    }

    function getTopLevelTarget(item) {
        /*
            Если выделена картинка внутри группы, поднимаемся до верхней группы.
            Если выделена сама группа - берём её.
            Если одиночная картинка на слое - берём её.
        */

        if (!item) return null;

        if (item.typename === "GroupItem" && containsImage(item)) {
            return item;
        }

        if (isImageLike(item)) {
            var current = item;

            while (
                current.parent &&
                current.parent.typename !== "Layer" &&
                current.parent.typename !== "Document"
            ) {
                current = current.parent;
            }

            return current;
        }

        return null;
    }

    function getSelectionData() {
        var result = {
            paths: [],
            targets: []
        };

        var sel = doc.selection;

        for (var i = 0; i < sel.length; i++) {
            var item = sel[i];

            if (isUsablePath(item)) {
                addUnique(result.paths, item);
                continue;
            }

            var target = getTopLevelTarget(item);

            if (target) {
                addUnique(result.targets, target);
                continue;
            }

            if (item.typename === "GroupItem") {
                scanPathsOnly(item, result);
            }
        }

        return result;
    }

    function getParentItems(parent) {
        try {
            return parent.pageItems;
        } catch (e) {
            return null;
        }
    }

    function getIndexInParent(item) {
        try {
            var items = getParentItems(item.parent);

            if (!items) return 0;

            for (var i = 0; i < items.length; i++) {
                if (items[i] === item) {
                    return i;
                }
            }
        } catch (e) {}

        return 0;
    }

    function getStackPath(item) {
        /*
            Собираем путь реального положения:
            слой → объект → вложенность.

            Для твоего случая важно первое число:
            группа / одиночное изображение / группа / одиночное изображение.
        */

        var path = [];
        var current = item;

        while (
            current &&
            current.parent &&
            current.parent.typename !== "Document"
        ) {
            path.unshift(getIndexInParent(current));

            if (current.parent.typename === "Layer") {
                break;
            }

            current = current.parent;
        }

        return path;
    }

    function compareStackPath(a, b) {
        var ap = getStackPath(a);
        var bp = getStackPath(b);

        var len = Math.max(ap.length, bp.length);

        for (var i = 0; i < len; i++) {
            var av = typeof ap[i] !== "undefined" ? ap[i] : -999999;
            var bv = typeof bp[i] !== "undefined" ? bp[i] : -999999;

            if (av !== bv) {
                if (PAGEITEMS_TOP_FIRST) {
                    return av - bv;
                } else {
                    return bv - av;
                }
            }
        }

        return 0;
    }

    function sortTargetsByRealLayerOrder(items) {
        /*
            Больше не используем zOrderPosition.
            Сортируем по реальному порядку parent.pageItems.
        */

        items.sort(compareStackPath);
        return items;
    }

    function collectSelectedPaths() {
        var arr = [];

        function scan(item) {
            if (!item) return;

            if (
                item.typename === "PathItem" ||
                item.typename === "CompoundPathItem"
            ) {
                arr.push(item);
                return;
            }

            if (item.typename === "GroupItem") {
                for (var i = 0; i < item.pageItems.length; i++) {
                    scan(item.pageItems[i]);
                }
            }
        }

        if (!doc.selection) return arr;

        for (var i = 0; i < doc.selection.length; i++) {
            scan(doc.selection[i]);
        }

        return arr;
    }

    function containsItem(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) return true;
        }
        return false;
    }

    function getItemArea(item) {
        try {
            var b = item.geometricBounds;
            var w = Math.abs(b[2] - b[0]);
            var h = Math.abs(b[1] - b[3]);
            return w * h;
        } catch (e) {
            return 0;
        }
    }

    function removePaint(item) {
        if (!item) return;

        if (item.typename === "PathItem") {
            item.filled = false;
            item.stroked = false;
            return;
        }

        if (item.typename === "CompoundPathItem") {
            for (var i = 0; i < item.pathItems.length; i++) {
                item.pathItems[i].filled = false;
                item.pathItems[i].stroked = false;
            }
            return;
        }

        if (item.typename === "GroupItem") {
            for (var j = 0; j < item.pageItems.length; j++) {
                removePaint(item.pageItems[j]);
            }
        }
    }

    function createOffsetContourWithIllustratorDialog(sourceContour) {
        clearSelection();

        try {
            sourceContour.selected = true;
        } catch (e0) {
            alert("Не удалось выделить исходный контур.");
            return null;
        }

        var oldPaths = collectSelectedPaths();

        try {
            app.executeMenuCommand("OffsetPath v23");
        } catch (e1) {
            alert("Не удалось открыть окно параллельного контура Illustrator.");
            return null;
        }

        app.redraw();

        try {
            $.sleep(200);
        } catch (e2) {}

        var afterPaths = collectSelectedPaths();

        if (!afterPaths.length) {
            return null;
        }

        var candidates = [];

        for (var i = 0; i < afterPaths.length; i++) {
            if (!containsItem(oldPaths, afterPaths[i])) {
                candidates.push(afterPaths[i]);
            }
        }

        if (!candidates.length) {
            return null;
        }

        var offsetContour = candidates[0];

        if (candidates.length > 1) {
            var bestArea = getItemArea(offsetContour);

            for (var j = 1; j < candidates.length; j++) {
                var area = getItemArea(candidates[j]);

                if (area > bestArea) {
                    bestArea = area;
                    offsetContour = candidates[j];
                }
            }
        }

        removePaint(offsetContour);
        clearSelection();

        return offsetContour;
    }

    function makeMaskOnOriginal(contentItem, maskItem) {
        if (!contentItem || !maskItem) return null;

        clearSelection();

        /*
            Контур ставим локально выше конкретного объекта.
            Не используем bringToFront, чтобы не ломать общий порядок слоя.
        */

        try {
            maskItem.move(contentItem, ElementPlacement.PLACEBEFORE);
        } catch (e1) {
            try {
                maskItem.move(contentItem, ElementPlacement.PLACEAFTER);
            } catch (e2) {}
        }

        clearSelection();

        try {
            contentItem.selected = true;
            maskItem.selected = true;
        } catch (e3) {
            alert("Не удалось выделить объект и маску.");
            return null;
        }

        try {
            app.executeMenuCommand("makeMask");
        } catch (e4) {
            try {
                app.executeMenuCommand("Make Clipping Mask");
            } catch (e5) {
                alert("Не удалось создать обтравочную маску.");
                return null;
            }
        }

        app.redraw();

        try {
            $.sleep(150);
        } catch (e6) {}

        return doc.selection && doc.selection.length > 0 ? doc.selection[0] : null;
    }

    var data = getSelectionData();

    if (data.paths.length === 0) {
        alert("Не найден замкнутый векторный контур.");
        return;
    }

    if (data.targets.length === 0) {
        alert("Не найдено ни одного изображения или группы с изображением.");
        return;
    }

    var sourceContour = data.paths[0];
    var targets = sortTargetsByRealLayerOrder(data.targets.slice());

    for (var i = 0; i < targets.length; i++) {
        var currentTarget = targets[i];

        var offsetContour = createOffsetContourWithIllustratorDialog(sourceContour);

        if (!offsetContour) {
            clearSelection();
            break;
        }

        makeMaskOnOriginal(currentTarget, offsetContour);

        clearSelection();

        app.redraw();

        try {
            $.sleep(200);
        } catch (eLoop) {}
    }

    clearSelection();

})();