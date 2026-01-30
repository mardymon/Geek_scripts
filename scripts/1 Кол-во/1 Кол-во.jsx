// 1 Кол-во.jsx — окно ScriptUI + раскладка 5 в ряд, первая позиция — исходный объект
// Копии идут ВВЕРХ от исходного (newY = origTop + ...). Чтобы вниз — смени на минус.

(function () {

    // ========= Настройки =========
    var SPACING_X = 10;  // pt — расстояние по X между объектами
    var SPACING_Y = 10;  // pt — расстояние по Y между строками
    var COLS      = 5;   // объектов в строке (слот 0 — исходный объект)

    // ========= Окно ScriptUI =========
    function askCopiesCount(defaultValue) {
        // defaultValue — строка по умолчанию (например "10")
        var win = new Window('dialog', 'Расстановка копий');
        win.orientation = 'column';
        win.alignChildren = ['fill','top'];
        win.margins = 14;

        var grpRow = win.add('group');
        grpRow.orientation = 'row';
        grpRow.alignChildren = ['fill','center'];

        grpRow.add('statictext', undefined, 'Количество копий:');

        var edt = grpRow.add('edittext', undefined, defaultValue || '10');
        edt.characters = 8;   // ширина поля
        edt.active = true;

        // Кнопки
        var btns = win.add('group');
        btns.orientation = 'row';
        btns.alignment = ['right','bottom'];

        var okBtn = btns.add('button', undefined, 'OK', {name:'ok'});
        var cancelBtn = btns.add('button', undefined, 'Отмена', {name:'cancel'});

        // Явно задаём элементы по умолчанию.
        // Это помогает «съедать» Enter/Esc внутри диалога, чтобы после закрытия
        // Enter не проваливался в Illustrator и не запускал стандартные команды.
        win.defaultElement = okBtn;
        win.cancelElement = cancelBtn;

        // Перехват Enter/Esc на уровне окна (и поля ввода) и отмена дальнейшей обработки.
        function handleKeys(k) {
            if (!k) return;
            if (k.keyName === 'Enter') {
                // НЕ закрываем окно напрямую по Enter — запускаем валидацию через OK.
                okBtn.notify('onClick');
                k.cancel = true;
            } else if (k.keyName === 'Escape') {
                win.close(0);
                k.cancel = true;
            }
        }

        try { win.addEventListener('keydown', handleKeys); } catch (e) {}
        try { edt.addEventListener('keydown', handleKeys); } catch (e) {}

        // Валидация при OK
        okBtn.onClick = function () {
            var v = (edt.text || '').replace(/^\s+|\s+$/g, '');
            if (!/^\d+$/.test(v) || parseInt(v,10) <= 0) {
                alert('Введите корректное целое число (> 0).');
                return;
            }
            // Перед закрытием слегка гасим окно, чтобы Enter не «проскочил» в Illustrator.
            try { win.enabled = false; } catch (e) {}
            win.close(1); // OK
        };

        cancelBtn.onClick = function () { win.close(0); };

        // Поддержка Enter/Esc уже есть через name:'ok'/'cancel'
        var result = win.show();
        if (result !== 1) return null; // пользователь отменил

        return parseInt(edt.text, 10);
    }

    // ========= Проверки окружения =========
    if (app.documents.length === 0) {
        alert('Пожалуйста, откройте документ в Illustrator.');
        return;
    }
    var doc = app.activeDocument;

    if (!doc.selection || doc.selection.length === 0) {
        alert('Пожалуйста, выберите группу объектов (вектор + растр).');
        return;
    }

    var selectedObject = doc.selection[0];
    if (!selectedObject || selectedObject.typename !== 'GroupItem') {
        alert('Пожалуйста, выберите группу объектов.');
        return;
    }

    // ========= Ввод количества через окно =========
    var copiesCount = askCopiesCount('10');
    if (copiesCount === null) { return; } // Отмена

    // ========= Геометрия исходного =========
    var objWidth  = selectedObject.width;
    var objHeight = selectedObject.height;

    // Позиция (левый верхний угол) исходного объекта
    var origLeft = selectedObject.position[0];
    var origTop  = selectedObject.position[1];

    // ========= Создание копий =========
    // Слот 0 — исходный объект; создаём копии, начиная со слота 1
    for (var i = 1; i <= copiesCount; i++) {
        var slot = i;                        // 0 — исходный, 1..N — копии
        var col  = slot % COLS;             // столбец
        var row  = Math.floor(slot / COLS); // строка

        var newX = origLeft + col * (objWidth  + SPACING_X);

        // ВВЕРХ от исходного:
        var newY = origTop  + row * (objHeight + SPACING_Y);
        // Чтобы раскладывать ВНИЗ, используй:
        // var newY = origTop - row * (objHeight + SPACING_Y);

        var newCopy = selectedObject.duplicate();
        newCopy.position = [newX, newY];

        // Если потребуется логика под маски, добавь здесь
        // processMaskForCopy(newCopy);
    }

    //alert('Готово! Всего объектов теперь: ' + (copiesCount + 1));

    // ========= Заглушка под будущую обработку маски =========
    function processMaskForCopy(copy) { /* no-op */ }

})();