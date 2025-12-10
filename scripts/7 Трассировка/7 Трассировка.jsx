﻿// 7 Трассировка.jsx
// Копирует выбранные растровые/размещённые объекты (по выбору)
// и трассирует их дубликаты / оригиналы пресетом "Силуэты"

#target illustrator

// Название пресета трассировки (должен существовать в Иллюстраторе)
var PRESET_NAME = "Силуэты";

if (app.documents.length === 0) {
    alert("Нет открытого документа. Пожалуйста, откройте документ и выберите растровые или размещённые объекты.");
} else {
    var doc = app.activeDocument;

    // Проверим, что нужный пресет есть в списке
    var presets = app.tracingPresetsList;
    var hasPreset = false;
    for (var i = 0; i < presets.length; i++) {
        if (presets[i] === PRESET_NAME) {
            hasPreset = true;
            break;
        }
    }
    if (!hasPreset) {
        alert('Пресет трассировки "' + PRESET_NAME + '" не найден.\n' +
              'Проверьте, что он есть в меню трассировки.');
    } else {
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
            alert("Нет выбранных объектов.");
        } else {

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

            btnCopy.onClick = function () {
                mode = "copy";
                dlg.close(1);
            };
            btnNoCopy.onClick = function () {
                mode = "nocopy";
                dlg.close(1);
            };
            btnCancel.onClick = function () {
                mode = null;
                dlg.close(0);
            };

            var dlgResult = dlg.show();
            if (dlgResult != 1 || mode === null) {
                // Пользователь отменил — выходим
                exit();
            }

            // --- СФОРМИРОВАТЬ СПИСОК ОБЪЕКТОВ ДЛЯ ТРАССИРОВКИ ---

            var itemsToTrace = [];

            if (mode === "copy") {
                // Создаём копии всех выбранных объектов
                for (var s = 0; s < sel.length; s++) {
                    var item = sel[s];
                    var dup = item.duplicate();
                    itemsToTrace.push(dup);
                }
            } else {
                // Без копий — работаем по исходным объектам
                for (var s2 = 0; s2 < sel.length; s2++) {
                    itemsToTrace.push(sel[s2]);
                }
            }

            // Выбираем только те объекты, по которым будет трассировка
            doc.selection = itemsToTrace;

            // --- ТРАССИРОВКА ---

            for (var j = 0; j < itemsToTrace.length; j++) {
                var tItem = itemsToTrace[j];
                if (tItem.typename === "RasterItem" || tItem.typename === "PlacedItem") {
                    var traceObj = tItem.trace();
                    traceObj.tracing.tracingOptions.loadFromPreset(PRESET_NAME);
                    traceObj.tracing.tracingOptions.fills = true;
                    traceObj.tracing.tracingOptions.strokes = false;
                    app.redraw();
                    traceObj.tracing.expandTracing();
                }
            }

            // Сообщение о завершении специально НЕ показываем
        }
    }
}
