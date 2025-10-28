// MoveSelectionToNewLayer.jsx
// Скрипт для Illustrator 2025: создаёт новый слой и переносит на него все выделенные объекты

#target illustrator
(function () {
    if (app.documents.length === 0) {
        alert("Ошибка: нет открытых документов.");
        return;
    }
    var doc = app.activeDocument;

    if (!(doc.selection instanceof Array) || doc.selection.length === 0) {
        alert("Пожалуйста, выделите хотя бы один объект.");
        return;
    }
    var sel = doc.selection;

    // Создаём новый слой и перемещаем его наверх
    var newLayer = doc.layers.add();
    newLayer.name = "Перенесённые объекты";

    // Переносим каждый выделенный объект «внутрь» нового слоя
    // Проходим в обратном порядке, чтобы не нарушать индексы selection
    for (var i = sel.length - 1; i >= 0; i--) {
        try {
            // PLACEATBEGINNING — вставить в начало списка объектов слоя
            sel[i].move(newLayer, ElementPlacement.PLACEATBEGINNING);
        } catch (e) {
            // Некоторые элементы (например, направляющие) не поддерживают move — пропускаем их
        }
    }

    // Снимаем выделение
    doc.selection = null;

    alert("Выделенные объекты перенесены на слой «" + newLayer.name + "».");
})();
