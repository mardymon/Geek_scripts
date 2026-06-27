// 1 Кол-во.jsx — Исправленная версия (Итоговое количество = Main + Extra)
(function () {
    // ========= Настройки =========
    var SPACING_X = 10;
    var SPACING_Y = 10;
    var COLS      = 5;

    // ========= Файл настроек =========
    var scriptFolder = Folder($.fileName).parent;
    var configFile = new File(scriptFolder + "/extra_copies_settings.txt");

    function loadExtraCopies() {
        if (configFile.exists) {
            configFile.open("r");
            var val = configFile.read();
            configFile.close();
            return val || "0";
        }
        return "0";
    }

    function saveExtraCopies(val) {
        configFile.open("w");
        configFile.write(val);
        configFile.close();
    }

    // ========= Окно =========
    var win = new Window('dialog', 'Расстановка копий');
    win.orientation = 'column';
    win.alignChildren = ['fill','top'];
    win.margins = 14;

    var grpMain = win.add('group');
    grpMain.orientation = 'row';
    grpMain.add('statictext', undefined, 'кол-во:');
    var edtMain = grpMain.add('edittext', undefined, '10');
    edtMain.characters = 8;
    edtMain.active = true; // Устанавливаем фокус на поле ввода

    var grpExtra = win.add('group');
    grpExtra.orientation = 'row';
    grpExtra.add('statictext', undefined, 'Доп.   :');
    var edtExtra = grpExtra.add('edittext', undefined, loadExtraCopies());
    edtExtra.characters = 8;

    var btns = win.add('group');
    btns.alignment = 'right';
    var okBtn = btns.add('button', undefined, 'OK', {name:'ok'});
    var cancelBtn = btns.add('button', undefined, 'Отмена', {name:'cancel'});

    if (win.show() !== 1) return;

    var mainCount = parseInt(edtMain.text) || 0;
    var extraCount = parseInt(edtExtra.text) || 0;
    saveExtraCopies(extraCount);

    // ========= Логика =========
    if (app.documents.length === 0) return;
    var doc = app.activeDocument;
    if (!doc.selection || doc.selection.length === 0) return;

    var selectedObject = doc.selection[0];
    
    // Итоговое количество объектов (включая оригинал)
    var totalTarget = mainCount + extraCount;
    // Количество копий, которые нужно создать = Итого - 1 (оригинал)
    var copiesToMake = totalTarget - 1;

    var objWidth  = selectedObject.width;
    var objHeight = selectedObject.height;
    var origLeft = selectedObject.position[0];
    var origTop  = selectedObject.position[1];

    // Цикл создания копий
    for (var i = 1; i <= copiesToMake; i++) {
        var col  = i % COLS;
        var row  = Math.floor(i / COLS);
        
        var newX = origLeft + col * (objWidth + SPACING_X);
        var newY = origTop  + row * (objHeight + SPACING_Y);

        var newCopy = selectedObject.duplicate();
        newCopy.position = [newX, newY];
    }
})();