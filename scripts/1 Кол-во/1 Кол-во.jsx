// Главная функция
function duplicateGroupOnArtboard() {
    // Проверка, что документ открыт
    if (app.documents.length === 0) {
        alert("Пожалуйста, откройте документ в Illustrator.");
        return;
    }

    var doc = app.activeDocument;

    // Проверка, что есть выделенный объект
    if (doc.selection.length === 0) {
        alert("Пожалуйста, выберите группу объектов (вектор + растр).");
        return;
    }

    // Получаем выделенный объект
    var selectedObject = doc.selection[0];

    // Проверка, что выделенный объект является группой
    if (!(selectedObject.typename === "GroupItem")) {
        alert("Пожалуйста, выберите группу объектов.");
        return;
    }

    // Запрос количества копий у пользователя
    var copiesCount = parseInt(prompt("Введите количество копий:", "5"), 10);
    if (isNaN(copiesCount) || copiesCount <= 0) {
        alert("Введите корректное число копий.");
        return;
    }

    // Запрос расстояния между объектами
    var spacingX = parseFloat(prompt("Введите расстояние по горизонтали между объектами:", "10"));
    var spacingY = parseFloat(prompt("Введите расстояние по вертикали между объектами:", "10"));

    if (isNaN(spacingX) || isNaN(spacingY)) {
        alert("Введите корректные значения расстояний.");
        return;
    }

    // Размеры исходного объекта
    var objWidth = selectedObject.width;
    var objHeight = selectedObject.height;

    // Начальные координаты для создания копий под группой
    var startX = selectedObject.position[0] - objWidth / 2; // Стартовая точка по X
    var startY = selectedObject.position[1] + objHeight + spacingY; // Сдвигаем ниже на всю высоту группы и расстояние

    // Количество строк и столбцов
    var cols = Math.ceil(Math.sqrt(copiesCount)); // Количество столбцов
    var rows = Math.ceil(copiesCount / cols); // Количество строк

    // Цикл для создания копий
    for (var i = 0; i < copiesCount; i++) {
        var newRow = Math.floor(i / cols); // Номер строки
        var newCol = i % cols; // Номер столбца

        // Вычисляем позицию новой копии
        var posX = startX + newCol * (objWidth + spacingX); // Располагаем по горизонтали
        var posY = startY + newRow * (objHeight + spacingY); // Располагаем по вертикали под группой

        // Создаем копию
        var newCopy = selectedObject.duplicate();
        newCopy.position = [posX, posY];

        // Обрабатываем маску для копии
        processMaskForCopy(newCopy);
    }

    alert("Копии успешно созданы!");
}

// Функция для обработки маски (если она нужна)
function processMaskForCopy(copy) {
    // Здесь можно добавить логику для обработки масок, если это необходимо
}

// Запуск скрипта
duplicateGroupOnArtboard();