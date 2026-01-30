﻿#target illustrator
/**
 * Скрипт для выбора артикула из списка, размещения его под выделенными объектами
 * и добавления соответствующего символа из внешнего файла.
 */

// === CONFIG: путь к библиотеке и поведение при OOS ===
var SYMBOL_LIBRARY_PATH = "C:\\Program Files\\Adobe\\Adobe Illustrator 2025\\Presets\\ru_RU\\Сценарии\\symbols.ai";
var OOS_LIST_FILENAME   = "symbols_oos.txt"; // лежит в ТЕ ЖЕЙ папке, что и symbols.ai
var OOS_REPLACEMENT_TEXT = "Замените акрил";
var ALERT_COLORIZE_TEXT = true;              // красить подпись артикула в красный, если нет в наличии
var BLOCK_INSERT_ON_OOS = false;             // true => не вставлять иконку, если артикул отсутствует


(function() {
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

    // Преобразование мм в пункты
    function mmToPts(mm) {
        return mm * 72 / 25.4;
    }
    var offset = mmToPts(2); // Смещение текста вниз от selection

    // Вычисляем границы всей выборки: [left, top, right, bottom]
    var left   =  Infinity,
        top    = -Infinity,
        right  = -Infinity,
        bottom =  Infinity;
    for (var i = 0; i < sel.length; i++) {
        var b = sel[i].geometricBounds; // [left, top, right, bottom]
        left   = Math.min(left,   b[0]);
        top    = Math.max(top,    b[1]);
        right  = Math.max(right,  b[2]);
        bottom = Math.min(bottom, b[3]);
    }

function readOOSSetAdjacentTo(libPath) {
    var set = {};
    try {
        var libFile = File(libPath);
        var oosFile = File(libFile.path + "/" + OOS_LIST_FILENAME);
        if (oosFile.exists) {
            oosFile.encoding = "UTF-8";
            if (oosFile.open("r")) {
                var txt = oosFile.read(); 
                oosFile.close();
                var lines = txt.split(/\r?\n/);
                for (var i = 0; i < lines.length; i++) {
                    var s = (lines[i] || "").replace(/^\s+|\s+$/g, "");
                    if (!s || s.charAt(0) === "#") continue; // игнор комментариев и пустых строк
                    set[s] = true; // точное совпадение с артикулами
                }
            }
        }
    } catch (e) { /* тихо игнорируем */ }
    return set;
}

    // Список артикулов
    var articleList = [
        "Жемчуг", "Звезды", "Битое стекло",
        "A01", "102", "212", "302", "303", "314", "373", "991", "992", "993", "997",
        "2020", "2092", "2364", "3032", "3225", "3632", "3713", "3725", "5001", "5053",
        "5090", "5093", "8202", 
        "1015M", "1545M", "1551M", "2401M", "3667M", "3673M", "54700", "5403M", "5404M", "5405M", "5245М", "5046M",
        "FT-LB100", "FT-LB200", "FT-LB401", "FT-LB601", "FT-LB702", "FT-LB709", "FT-LB800", "FT-LB901", "FT-LB911", "FT-221213",
        "GST-301", "GST-304", "GST-201", "GST-202", "GST-204", "GST-205", "GST-206", "GST-207", "GST-208", "GST-601", 
        "GSS-T1", "GSS-T2", "GSS-T3", "GSS-T4", "GSS-T5", "GSS-T6", "GSS-T7", "GSS-T8",
        "GSS-01", "GSS-03", "GSS-04", "GSS-07", "GSS-08", "GSS-11",
        "GSY-S1", "GSS-S2", "GSY-S3", "GSY-S8", "GSY-S11",
        "GSY-F3", "GSY-F4", "GSY-F5", "GSY-M7", "GSY-M8", "GSY-LB100-HM", "GSC-300", "GSY-105",  
        "HA-01", "HA-02", 
        "WT-04", "WT-03", "WT-02", "WT-01", "WT-991", "WT-992", "WT-5001", "WT-8212", "WT-A01", "WT-Жемчуг", "TR-A01",
        "GSS-Y1", "GSS-Y2", "GSS-Y3", "GSS-Y4", "LMN1", "LMN2", "LMN3", "LMN4",
        "D37", "9T36",
        "000М", "CFS-1", "CFS-2", "CFS-3", "CFS-4", "CFS-5", "CFS-6", 
        "IM-01", "IM-02", "IM-03", "IM-04", "IM-05", "IM-06", 
        "Черный", "Белый", "Зеленый", "Синий", "Желтый", "Красный",
        "MK-04", "MK-03", "MK-05", "502M", "801A",  "1528M", "1529M", "2378M",
        "16", "35", "109", "134", "157", "2677", "3674", "5140", "5149", "5215", "5251", "6202",  "7202", "8352", "8635", "45201",
        "GS-09", "GS-03", "GS-01", "GS-11", "S-313", "416M", "444M", "SK-1", "SK-2", "SK-3", "SK-4", "SK-5", "SK-6", "SK-7", "SK-8", "SK-9", "SK-10",
        "SF-01", "SF-02", "SF-05", "HA-03", "HA-04", "HA-05", "HA-06",
        "LH-5", "SW-17", "BF-16", "DH-11", "FP-11", "LY-802", "LY-806", "LY-812", "XK-2", "XK-4", "XK-8", "XK-12",
        "RE-1", "RE-2", "RE-3", "JA-01", "JA-03", "JA-04", "JA-05"
    ];

    // === UI: диалог ===
    var dlg = new Window("dialog", "Выберите артикул и комментарий");
    dlg.alignChildren = "fill";

    dlg.add("statictext", undefined, "Начните ввод и выберите из списка:");
    var input = dlg.add("edittext", undefined, "");
    input.characters = 30;

    var suggestionList = dlg.add("listbox", undefined, [], {multiselect:false});
    suggestionList.visible = false;
    suggestionList.preferredSize = [150, 200];

    dlg.add("statictext", undefined, "Комментарий (необязательно):");
    var commentInput = dlg.add("edittext", undefined, "");
    commentInput.characters = 30;

    var btnGroup = dlg.add("group");
    btnGroup.alignment = "right";
    var okBtn = btnGroup.add("button", undefined, "OK", {name:"ok"});
    var cancelBtn = btnGroup.add("button", undefined, "Отмена", {name:"cancel"});

    input.onChanging = function() {
        var q = input.text.toLowerCase();
        suggestionList.removeAll();
        if (!q) {
            suggestionList.visible = false;
            return;
        }
        for (var i = 0; i < articleList.length; i++) {
            var v = articleList[i];
            if (v.toLowerCase().indexOf(q) !== -1) {
                suggestionList.add("item", v);
            }
        }
        suggestionList.visible = suggestionList.items.length > 0;
    };
    suggestionList.onChange = function() {
        if (suggestionList.selection) {
            input.text = suggestionList.selection.text;
            suggestionList.visible = false;
        }
    };

    cancelBtn.onClick = function() {
        dlg.close();
    };

    okBtn.onClick = function() {
        if (!input.text) {
            alert("Введите артикул!");
            return;
        }
        dlg.close();

        var artikal = input.text;
        var content = artikal;
        if (commentInput.text) {
            content += "\r" + commentInput.text;
        }

        var tf = doc.textFrames.add();
        tf.contents = content;
        tf.textRange.characterAttributes.size = 15;

        var tb = tf.geometricBounds;
        var textW = tb[2] - tb[0];
        var textH = tb[1] - tb[3];
        var newX = (left + right) / 2 - textW / 2;
        var newY = bottom - offset;
        tf.position = [newX, newY];
        
        // === Проверка на "нет в наличии" по внешнему файлу ===
var oosSet = readOOSSetAdjacentTo(SYMBOL_LIBRARY_PATH);
var isOOS  = !!oosSet[artikal];


if (isOOS) {
    alert("Внимание: '" + artikal + "' нет в наличии.");
    // Меняем подпись на текст-замену и перецентрируем
    tf.contents = OOS_REPLACEMENT_TEXT;
    app.redraw();
    var tb2 = tf.geometricBounds;
    var textW2 = tb2[2] - tb2[0];
    var newX2 = (left + right) / 2 - textW2 / 2;
    tf.position = [newX2, newY];
    // Полный выход: не открывать symbols.ai, не вставлять иконку
    return;
}



// === Вставка иконки из symbols.ai (безопасная) ===
(function insertSymbolFromLibrary(){
    if (typeof escapeRegExp !== "function") {
    var escapeRegExp = function (s) {
        return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };
}
if (typeof findSymbolByArtikal !== "function") {
    var findSymbolByArtikal = function (symDoc, artikal) {
        var re = new RegExp("^" + escapeRegExp(artikal) + "(?:\\b|\\s|[-_|]|$)", "i");
        for (var i = 0; i < symDoc.symbols.length; i++) {
            var s = symDoc.symbols[i];
            if (re.test(s.name)) return s;
        }
        return null;
    };
}
    var libFile = File(SYMBOL_LIBRARY_PATH);
    if (!libFile.exists) {
        alert("Не найден файл библиотеки символов:\n" + SYMBOL_LIBRARY_PATH);
        return;
    }

    var symbolDoc = app.open(libFile);
    try {
        // На всякий случай укажем активный слой (иногда это важно для add())
        if (symbolDoc.layers && symbolDoc.layers.length) {
            symbolDoc.activeLayer = symbolDoc.layers[0];
        }

        var sym = findSymbolByArtikal(symbolDoc, artikal);
        if (!sym) {
            alert("Символ '" + artikal + "' не найден в библиотеке symbols.ai.\n" +
                  "Проверьте имя символа: оно должно начинаться с артикула.");
            return; // ничего не добавляем/копируем
        }

        // Создадим инстанс символа, скопируем в буфер и вернёмся в рабочий документ
        var tempItem = symbolDoc.symbolItems.add(sym);
        tempItem.selected = true;
        app.copy();

    } catch (e) {
        alert("Ошибка при подготовке символа из библиотеки:\n" + e);
        return; // прерываемся
    } finally {
        // библиотеку всегда закрываем без сохранения
        try { symbolDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (_e) {}
    }

    // Вставка в рабочий документ
    app.activeDocument = doc;
    app.paste();

    // Превратим вставленное в символ документа, разместим и сгруппируем с подписью
    var pasted = (doc.selection && doc.selection.length) ? doc.selection[0] : null;
    if (!pasted) return;

    var newSymbol = doc.symbols.add(pasted);
    pasted.remove();

    var icon = doc.symbolItems.add(newSymbol);
    icon.position = [newX + textW + mmToPts(2), newY];

    var g = doc.groupItems.add();
    tf.moveToBeginning(g);
    icon.moveToBeginning(g);
    doc.selection = [ g ];
    app.executeMenuCommand('ungroup');
    doc.selection = null;
})();
};

dlg.center();
dlg.show();

})();