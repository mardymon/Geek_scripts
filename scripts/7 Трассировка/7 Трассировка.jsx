﻿// ImageTracing_WithDuplicates.jsx
// Adobe Illustrator script: копирует выбранные растровые или размещённые объекты, 
// а затем трассирует созданные дубликаты с выбранным пресетом.

#target illustrator

if (app.documents.length === 0) {
    alert("Нет открытого документа. Пожалуйста, откройте документ и выберите растровые или размещённые объекты.");
} else {
    var doc = app.activeDocument;
    var presets = app.tracingPresetsList;
    if (presets.length === 0) {
        alert("Пресеты трассировки не найдены.");
    } else {
        // Окно выбора пресета
        var dlg = new Window("dialog", "Image Trace");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.add("statictext", undefined, "Выберите пресет трассировки:");
        var list = dlg.add("dropdownlist", undefined, presets);
        list.selection = 0;
        var btnGroup = dlg.add("group");
        btnGroup.alignment = "right";
        btnGroup.add("button", undefined, "OK",   {name: "ok"});
        btnGroup.add("button", undefined, "Cancel",{name: "cancel"});
        
        if (dlg.show() == 1) {
            var presetName = presets[list.selection.index];
            var sel = doc.selection;
            if (sel.length === 0) {
                alert("Нет выбранных объектов.");
            } else {
                // 1) Создаём копии всех выбранных объектов
                var itemsToTrace = [];
                for (var i = 0; i < sel.length; i++) {
                    var item = sel[i];
                    // дублируем объект в том же слое
                    var dup = item.duplicate();
                    itemsToTrace.push(dup);
                }
                // 2) Сбрасываем выбор и выбираем только дубликаты
                doc.selection = itemsToTrace;
                
                // 3) Выполняем трассировку по дубликатам
                for (var i = 0; i < itemsToTrace.length; i++) {
                    var item = itemsToTrace[i];
                    if (item.typename === "RasterItem" || item.typename === "PlacedItem") {
                        var traceObj = item.trace();
                        traceObj.tracing.tracingOptions.loadFromPreset(presetName);
                        traceObj.tracing.tracingOptions.fills = true;
                        traceObj.tracing.tracingOptions.strokes = false;
                        app.redraw();
                        // развернуть результат трассировки
                        // вариант 1:
                        traceObj.tracing.expandTracing();
                        // вариант 2 (если нужно через меню):
                        // app.executeMenuCommand("expandTracing");
                    }
                }
                
                alert("Трассировка завершена по дубликатам.\nИспользован пресет: " + presetName);
            }
        }
    }
}
