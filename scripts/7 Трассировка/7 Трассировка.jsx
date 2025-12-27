﻿// 7 Трассировка.jsx
// Трассировка выбранных растровых/размещённых объектов пресетом "Силуэты"
// + после завершения остаётся выделение результата (expanded tracing)
// + сразу после трассировки запускается "8 Удалить белый.jsx" (если лежит рядом)
// + в конце результат объединяется в ГРУППУ и остаётся выделенным

#target illustrator

var PRESET_NAME = "Силуэты";
var REMOVE_WHITE_SCRIPT_NAME = "8 Удалить белый.jsx";

function addUnique(arr, item) {
    if (!item) return;
    for (var i = 0; i < arr.length; i++) if (arr[i] === item) return;
    arr.push(item);
}

function addSelectionUnique(arr, sel) {
    if (!sel || sel.length === 0) return;
    for (var i = 0; i < sel.length; i++) addUnique(arr, sel[i]);
}

function isAlive(item) {
    try { return !!item.typename; } catch (e) { return false; }
}

function filterAlive(arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) if (isAlive(arr[i])) out.push(arr[i]);
    return out;
}

function getFirstCommonParent(items) {
    // Возвращаем parent первого элемента (обычно этого достаточно и безопасно)
    // Если элементы из разных слоёв/групп — Illustrator всё равно сможет сгруппировать
    // при move() в новый GroupItem внутри doc.activeLayer.
    try {
        if (items && items.length > 0 && isAlive(items[0])) return items[0].parent;
    } catch (e) {}
    return null;
}

// ----- FALLBACK: логика "удалить белый" (если файл 8 не найден рядом) -----
function removeWhiteFromSelection(doc) {
    var sel = doc.selection;
    if (!(sel instanceof Array) || sel.length === 0) return;
    for (var i = sel.length - 1; i >= 0; i--) processItemRemoveWhite(sel[i]);
}

function processItemRemoveWhite(item) {
    if (!isAlive(item)) return;

    var type = item.typename;

    if (type === "GroupItem") {
        for (var i = item.pageItems.length - 1; i >= 0; i--) processItemRemoveWhite(item.pageItems[i]);
    } else if (type === "CompoundPathItem") {
        for (var j = item.pathItems.length - 1; j >= 0; j--) processItemRemoveWhite(item.pathItems[j]);
    } else if (type === "PathItem") {
        try {
            if (item.filled && isWhiteColor(item.fillColor)) item.remove();
        } catch (e) {}
    }
}

function isWhiteColor(color) {
    try {
        switch (color.typename) {
            case "RGBColor":
                return color.red === 255 && color.green === 255 && color.blue === 255;
            case "CMYKColor":
                return color.cyan === 0 && color.magenta === 0 && color.yellow === 0 && color.black === 0;
            case "GrayColor":
                return color.gray === 0;
            default:
                return false;
        }
    } catch (e) {
        return false;
    }
}

function tryRunSiblingScript(scriptName) {
    // Пытаемся запустить файл из той же папки, где лежит этот JSX
    try {
        var folder = new Folder(File($.fileName).path);
        var f = new File(folder.fsName + "/" + scriptName);
        if (f.exists) {
            $.evalFile(f);
            return true;
        }
    } catch (e) {}
    return false;
}

function groupSelection(doc) {
    // Группируем текущую выделенную финальную геометрию.
    var sel = filterAlive(doc.selection);
    if (!sel || sel.length === 0) return null;

    // Создаём новую группу в активном слое и переносим туда объекты
    var g = doc.activeLayer.groupItems.add();
    // Чтобы порядок не “перевернулся” — переносим в обратном порядке
    for (var i = sel.length - 1; i >= 0; i--) {
        try {
            sel[i].move(g, ElementPlacement.PLACEATBEGINNING);
        } catch (e) {}
    }

    doc.selection = [g];
    return g;
}

function main() {
    if (app.documents.length === 0) {
        alert("Нет открытого документа. Пожалуйста, откройте документ и выберите растровые или размещённые объекты.");
        return;
    }

    var doc = app.activeDocument;

    // Проверим, что нужный пресет есть в списке
    var presets = app.tracingPresetsList;
    var hasPreset = false;
    for (var i = 0; i < presets.length; i++) {
        if (presets[i] === PRESET_NAME) { hasPreset = true; break; }
    }
    if (!hasPreset) {
        alert('Пресет трассировки "' + PRESET_NAME + '" не найден.\nПроверьте, что он есть в меню трассировки.');
        return;
    }

    var sel = doc.selection;
    if (!sel || sel.length === 0) {
        alert("Нет выбранных объектов.");
        return;
    }

    // --- ОКНО ВЫБОРА РЕЖИМА: С КОПИЕЙ / БЕЗ КОПИИ ---
    var dlg = new Window("dialog", "Режим трассировки");
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];

    dlg.add("statictext", undefined, "Выберите режим работы:");

    var grp = dlg.add("group");
    grp.orientation = "row";
    grp.alignChildren = ["fill", "center"];

    var mode = null; // "copy" или "nocopy"
    var btnCopy   = grp.add("button", undefined, "С копией");
    var btnNoCopy = grp.add("button", undefined, "Без копии");
    var btnCancel = dlg.add("button", undefined, "Отмена", {name: "cancel"});

    btnCopy.onClick = function () { mode = "copy"; dlg.close(1); };
    btnNoCopy.onClick = function () { mode = "nocopy"; dlg.close(1); };
    btnCancel.onClick = function () { mode = null; dlg.close(0); };

    var dlgResult = dlg.show();
    if (dlgResult != 1 || mode === null) return;

    // --- СФОРМИРОВАТЬ СПИСОК ОБЪЕКТОВ ДЛЯ ТРАССИРОВКИ ---
    var itemsToTrace = [];

    if (mode === "copy") {
        for (var s = 0; s < sel.length; s++) {
            try {
                var dup = sel[s].duplicate();
                itemsToTrace.push(dup);
            } catch (e) {}
        }
    } else {
        for (var s2 = 0; s2 < sel.length; s2++) itemsToTrace.push(sel[s2]);
    }

    doc.selection = itemsToTrace;

    // Сюда соберём результаты EXPAND, чтобы в конце оставить их выделенными
    var expandedResults = [];

    // --- ТРАССИРОВАТЬ ---
    for (var j = 0; j < itemsToTrace.length; j++) {
        var tItem = itemsToTrace[j];
        if (!isAlive(tItem)) continue;

        if (tItem.typename === "RasterItem" || tItem.typename === "PlacedItem") {
            var traceObj = null;
            try {
                traceObj = tItem.trace();
            } catch (e1) {
                continue;
            }

            try {
                traceObj.tracing.tracingOptions.loadFromPreset(PRESET_NAME);
                traceObj.tracing.tracingOptions.fills = true;
                traceObj.tracing.tracingOptions.strokes = false;
            } catch (e2) {}

            app.redraw();

            var expanded = null;
            try {
                expanded = traceObj.tracing.expandTracing();
            } catch (e3) {
                expanded = null;
            }

            if (expanded) {
                addUnique(expandedResults, expanded);
            } else {
                // Fallback: после expand Ai обычно выделяет результат — забираем выделение
                addSelectionUnique(expandedResults, doc.selection);
            }
        }
    }

    expandedResults = filterAlive(expandedResults);
    if (expandedResults.length > 0) doc.selection = expandedResults;

    // --- ЗАПУСТИТЬ УДАЛЕНИЕ БЕЛОГО ---
    // Сначала пробуем выполнить отдельный скрипт "8 Удалить белый.jsx" из той же папки,
    // а если файла рядом нет — используем встроенный fallback.
    var ranExternal = tryRunSiblingScript(REMOVE_WHITE_SCRIPT_NAME);
    if (!ranExternal) {
        removeWhiteFromSelection(doc); 
    }

    app.redraw();

    // --- В КОНЦЕ ОСТАВИТЬ ВЫДЕЛЕНИЕ РЕЗУЛЬТАТА ---
    var finalSel = filterAlive(doc.selection);
    if (finalSel.length > 0) {
        doc.selection = finalSel;
    } else {
        expandedResults = filterAlive(expandedResults);
        if (expandedResults.length > 0) doc.selection = expandedResults;
    }

    // --- СГРУППИРОВАТЬ ФИНАЛЬНЫЙ РЕЗУЛЬТАТ И ОСТАВИТЬ ВЫДЕЛЕННЫМ ---
    groupSelection(doc);

    // Сообщения о завершении НЕ показываем
}

main();
