// Основной скрипт для выделения только растровых объектов и групп с растровыми объектами

// Получаем текущий документ
var doc = app.activeDocument;

// Проверяем, есть ли выделенные объекты
if (doc.selection.length === 0) {
    alert("Ничего не выделено. Пожалуйста, выделите объекты.");
} else {
    // Создаем массив для хранения подходящих объектов
    var rasterObjects = [];

    // Проходим по всем выделенным объектам
    for (var i = 0; i < doc.selection.length; i++) {
        var selectedItem = doc.selection[i];

        // Если объект является растровым, добавляем его в массив
        if (selectedItem.typename === "RasterItem") {
            rasterObjects.push(selectedItem);
        }
        // Если объект является группой, проверяем её содержимое
        else if (selectedItem.typename === "GroupItem") {
            if (containsRaster(selectedItem)) {
                rasterObjects.push(selectedItem);
            }
        }
    }

    // Если найдены подходящие объекты, выделяем их
    if (rasterObjects.length > 0) {
        doc.selection = rasterObjects;
    } else {
        alert("Нет подходящих растровых объектов или групп с растровыми объектами.");
    }
}

// Функция для проверки, содержит ли группа хотя бы один растровый объект
function containsRaster(group) {
    for (var j = 0; j < group.pageItems.length; j++) {
        var item = group.pageItems[j];
        if (item.typename === "RasterItem") {
            return true; // Группа содержит растровый объект
        } else if (item.typename === "GroupItem") {
            // Если внутри группы есть другая группа, проверяем её рекурсивно
            if (containsRaster(item)) {
                return true;
            }
        }
    }
    return false; // Группа не содержит растровых объектов
}