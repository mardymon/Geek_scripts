#target illustrator
/**
 * Артикул под макетом — v3.0 (Импорт локальных .ai файлов)
 */

// ── Конфигурация путей (динамическая) ───────────────────────────────────────
var SCRIPT_FOLDER        = new File($.fileName).path;
var SYMBOLS_FOLDER_PATH  = SCRIPT_FOLDER + "/symbols";
var OOS_LIST_FILENAME    = "symbols_oos.txt"; 
var OOS_REPLACEMENT_TEXT = "Замените акрил";

(function () {

    if (!app.documents.length) {
        alert("Нет открытого документа.");
        return;
    }
    var doc = app.activeDocument;
    var sel = doc.selection;
    if (!sel || sel.length < 1) {
        alert("Пожалуйста, выделите один или несколько объектов.");
        return;
    }

    function mmToPts(mm) { return mm * 72 / 25.4; }
    function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
    function buildArticleRegex(art) { return new RegExp("^" + escapeRegExp(art) + "(?:\\b|\\s|[-_|]|$)", "i"); }

    function findSymbolInCollection(symbols, art) {
        var re = buildArticleRegex(art);
        for (var i = 0; i < symbols.length; i++) {
            if (re.test(symbols[i].name)) return symbols[i];
        }
        return null;
    }

    /** Безопасное чтение файла отсутствующих товаров */
    function readOOSSet() {
        var set = {};
        try {
            var oosFile = new File(SCRIPT_FOLDER + "/" + OOS_LIST_FILENAME);
            if (oosFile && oosFile.exists) {
                if (oosFile.open("r")) {
                    oosFile.encoding = "UTF-8";
                    var lines = oosFile.read().split(/\r?\n/);
                    oosFile.close();
                    for (var i = 0; i < lines.length; i++) {
                        var s = (lines[i] || "").replace(/^\s+|\s+$/g, "");
                        if (s && s.charAt(0) !== "#") set[s] = true;
                    }
                }
            }
        } catch (e) { /* Игнорируем ошибки файловой системы */ }
        return set;
    }

    function getOrImportSymbol(doc, art) {
        var cached = findSymbolInCollection(doc.symbols, art);
        if (cached) return cached;

        var symbolsFolder = new Folder(SYMBOLS_FOLDER_PATH);
        if (!symbolsFolder.exists) {
            alert("Папка с AI-символами не найдена рядом со скриптом:\n" + SYMBOLS_FOLDER_PATH);
            return null;
        }

        var files = symbolsFolder.getFiles();
        var targetFile = null;
        var re = buildArticleRegex(art);

        for (var i = 0; i < files.length; i++) {
            if (files[i] instanceof File) {
                // Декодируем кириллицу в названиях файлов
                var decodedName = decodeURI(files[i].name); 
                
                // Ищем расширение .ai
                if (decodedName.match(/\.ai$/i)) {
                    var nameWithoutExt = decodedName.replace(/\.ai$/i, "");
                    if (re.test(nameWithoutExt)) {
                        targetFile = files[i];
                        break;
                    }
                }
            }
        }

        if (!targetFile) {
            alert("AI файл для артикула «" + art + "» не найден в папке symbols.\nУбедитесь, что файл называется именно " + art + ".ai");
            return null;
        }

        var importedSym = null;
        try {
            // Импортируем файл
            var importedGroup = doc.groupItems.createFromFile(targetFile);
            importedSym = doc.symbols.add(importedGroup);
            
            // Даем символу чистое декодированное имя без расширения .ai
            importedSym.name = decodeURI(targetFile.name).replace(/\.ai$/i, "");
            importedGroup.remove();
        } catch (e) {
            alert("Ошибка при импорте AI файла:\n" + e);
            importedSym = null;
        }

        return importedSym;
    }

    // Расчет границ выделения
    var offset = mmToPts(2);
    var left = Infinity, top = -Infinity, right = -Infinity, bottom = Infinity;
    for (var i = 0; i < sel.length; i++) {
        var b = sel[i].geometricBounds;
        left   = Math.min(left,   b[0]);
        top    = Math.max(top,    b[1]);
        right  = Math.max(right,  b[2]);
        bottom = Math.min(bottom, b[3]);
    }

    // Список артикулов
    var articleList = [
        "Жемчуг", "Звезды", "Битое стекло", "Радужный",
        "A01", "102", "212", "302", "303", "314", "373", "991", "992", "993", "997",
        "2020", "2092", "2364", "3032", "3225", "3632", "3713", "3725", "5001", "5053",
        "5090", "5093", "8202", 
        "1015M", "1545M", "1551M", "2401M", "3667M", "3673M", "54700", "5403M", "5404M", "5405M", "5245M", "5046M",
        "FT-LB100", "FT-LB200", "FT-LB401", "FT-LB601", "FT-LB702", "FT-LB709", "FT-LB800", "FT-LB901", "FT-LB911", "FT-221213",
        "GST-301", "GST-304", "GST-201", "GST-202", "GST-204", "GST-205", "GST-206", "GST-207", "GST-208", "GST-601", 
        "GSS-T1", "GSS-T2", "GSS-T3", "GSS-T4", "GSS-T5", "GSS-T6", "GSS-T7", "GSS-T8",
        "GSS-01", "GSS-03", "GSS-04", "GSS-07", "GSS-08", "GSS-11",
        "GSY-S1", "GSS-S2", "GSY-S3", "GSY-S8", "GSY-S11",
        "GSY-F3", "GSY-F4", "GSY-F5", "GSY-M7", "GSY-M8", "GSY-LB100-HM", "GSC-300", "GSY-105",  
        "HA-01", "HA-02", 
        "WT-04", "WT-03", "WT-02", "WT-01", "WT-991", "WT-992", "WT-5001", "WT-8212", "WT-A01", "WT-Жемчуг", "TR-A01",
        "GSS-Y1", "GSS-Y2", "GSS-Y3", "GSS-Y4", 
        "LMN1", "LMN2", "LMN3", "LMN4",
        "D37", "9T36",
        "000M", "CFS-1", "CFS-2", "CFS-3", "CFS-4", "CFS-5", "CFS-6",
        "TC-1", "TC-2", "TC-3", "TC-4", "TC-5", "TC-6", "TC-7", "TC-8", "TC-9",
        "IM-01", "IM-02", "IM-03", "IM-04", "IM-05", "IM-06", 
        "Черный", "Белый", "Зеленый", "Синий", "Желтый", "Красный",
        "MK-04", "MK-03", "MK-05", "502M", "801A",  "1528M", "1529M", "2378M", "416M", "444M",
        "16", "35", "109", "134", "157", "2677", "3674", "5140", "5149", "5215", "5251", "6202",  "7202", "8352", "8635", "45201",
        "GS-09", "GS-03", "GS-01", "GS-11", "GS-1001", "S-313",
        "SK-1", "SK-2", "SK-3", "SK-4", "SK-5", "SK-6", "SK-7", "SK-8", "SK-9", "SK-10",
        "SF-01", "SF-07", "SF-12", "SF-17", "SF-18", "SF-23", "SF-24",
        "HA-03", "HA-04", "HA-05", "HA-06",
        "LH-5", "BF-16", "DH-11", "FP-11", 
        "LY-802", "LY-806", "LY-812", 
        "XK-2", "XK-4", "XK-8", "XK-12",
        "RE-1", "RE-2", "RE-3", 
        "JA-01", "JA-03", "JA-04", "JA-05", 
        "SD-01", "SD-02", "SD-03", "SD-04", "SD-05", "SD-06", "SD-07", "SD-10", "SD-12", "SD-15",
        "CHR-01", "CHR-02", "GLD-01", "HOLO-01", "REF-01",
        "NK-1", "NK-2", "NK-4", "NK-6", "NK-7", "NK-8", "NK-10", "NK-26", "NK-27",
        "SHP-2", "SHP-4", "SHP-5", "SHP-H2","SHP-H3",
        "SW-17", "SW-2", "SW-108",
        "SYM-1", "SYM-2", "SYM-4",
        "RO-1",  "RO-2", "RO-3", "RO-4", "RO-5","RO-7", "RO-9"
    ];

    var dlg = new Window("dialog", "Выберите артикул");
    dlg.alignChildren = "fill";
    dlg.add("statictext", undefined, "Начните ввод:");
    var input = dlg.add("edittext", undefined, "");
    input.characters = 30;

    var suggestionList = dlg.add("listbox", undefined, [], { multiselect: false });
    suggestionList.visible = false;
    suggestionList.preferredSize = [150, 200];

    dlg.add("statictext", undefined, "Комментарий:");
    var commentInput = dlg.add("edittext", undefined, "");

    var btnGroup  = dlg.add("group");
    btnGroup.alignment = "right";
    var okBtn     = btnGroup.add("button", undefined, "OK", { name: "ok" });
    var cancelBtn = btnGroup.add("button", undefined, "Отмена", { name: "cancel" });

    input.onChanging = function () {
        var q = input.text.toLowerCase();
        suggestionList.removeAll();
        if (!q) { suggestionList.visible = false; return; }
        for (var i = 0; i < articleList.length; i++) {
            if (articleList[i].toLowerCase().indexOf(q) !== -1)
                suggestionList.add("item", articleList[i]);
        }
        suggestionList.visible = suggestionList.items.length > 0;
    };

    suggestionList.onChange = function () {
        if (suggestionList.selection) {
            input.text = suggestionList.selection.text;
            suggestionList.visible = false;
        }
    };

    cancelBtn.onClick = function () { dlg.close(); };

    okBtn.onClick = function () {
        if (!input.text) { alert("Введите артикул!"); return; }
        dlg.close();

        var artikal = input.text;
        var content = commentInput.text ? (artikal + "\r" + commentInput.text) : artikal;

        var tf = doc.textFrames.add();
        tf.contents = content;
        tf.textRange.characterAttributes.size = 15;

        var textW = tf.width;
        var newX  = (left + right) / 2 - textW / 2;
        var newY  = bottom - offset;
        tf.position = [newX, newY];

        var oosSet = readOOSSet();
        if (oosSet[artikal]) {
            alert("Внимание: «" + artikal + "» нет в наличии.");
            tf.contents = OOS_REPLACEMENT_TEXT;
            tf.position = [(left + right) / 2 - tf.width / 2, newY];
            return;
        }

        var sym = getOrImportSymbol(doc, artikal);
        if (!sym) return;

        var icon = doc.symbolItems.add(sym);
        
        // Принудительно обновляем экран
        app.redraw(); 
        
        // Берем точные границы первой базовой линии текста
        var tfBounds = tf.geometricBounds;
        var textTop  = tfBounds[1];
        var textRight= tfBounds[2];
        var textBottom=tfBounds[3];
        var textHeight = Math.abs(textTop - textBottom);

        var iconX = textRight + mmToPts(2);
        var iconY = textTop - (textHeight / 2) + (icon.height / 2); 
        
        icon.position = [iconX, iconY];

        var g = doc.groupItems.add();
        tf.moveToBeginning(g);
        icon.moveToBeginning(g);
        
        var groupWidth = g.width;
        var groupX = (left + right) / 2 - groupWidth / 2;
        g.position = [groupX, newY];
        
        tf.move(doc, ElementPlacement.PLACEATBEGINNING);
        icon.move(doc, ElementPlacement.PLACEATBEGINNING);
        g.remove();

        doc.selection = null;
    };

    dlg.center();
    dlg.show();

})();