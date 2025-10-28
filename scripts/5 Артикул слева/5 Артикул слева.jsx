#target illustrator
/**
 * Скрипт для выбора артикула из списка, размещения его слева от группы
 * и добавления необязательного комментария под артикулом.
 */
(function() {
    if (!app.documents.length) {
        alert("Нет открытого документа.");
        return;
    }
    var doc = app.activeDocument;
    var sel = doc.selection;
    if (!sel || sel.length !== 1 || sel[0].typename !== "GroupItem") {
        alert("Пожалуйста, выделите одну группу объектов.");
        return;
    }
    var group = sel[0];

    // Преобразование мм в пункты
    function mmToPts(mm) {
        return mm * 72 / 25.4;
    }
    var offset = mmToPts(50); // 50 мм в пунктах

    // Границы группы: [left, top, right, bottom]
    var gb = group.geometricBounds;
    var groupLeft = gb[0];
    var groupTop  = gb[1];

    // Список артикулов
    var articleList = [
        "Жемчуг", "Звезды", "Битое стекло",
        "A01", "102", "212", "302", "303", "314", "373", "991", "992", "993", "997",
        "2020", "2090", "2364", "3032", "3225", "3632", "3713", "3725", "5001", "5053",
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

var LABEL_SKUS = [
        "IM-01", "IM-02", "IM-03", "IM-04", "IM-05", "IM-06", 
        "Черный", "Белый", "Зеленый", "Синий", "Желтый", "Красный",
        "MK-04", "MK-03", "MK-05", "502M", "801A",  "1528M", "1529M", "2378M",
        "16", "35", "109", "134", "157", "2677", "3674", "5140", "5149", "5215", "5251", "6202",  "7202", "8352", "8635", "45201",
        "GS-09", "GS-03", "GS-01", "GS-11", "S-313", "416M", "444M", "SK-1", "SK-2", "SK-3", "SK-4", "SK-5", "SK-6", "SK-7", "SK-8", "SK-9", "SK-10",
        "SF-01", "SF-02", "SF-05", "HA-03", "HA-04", "HA-05", "HA-06",
        "LH-5", "SW-17", "BF-16", "DH-11", "FP-11", "LY-802", "LY-806", "LY-812", "XK-2", "XK-4", "XK-8", "XK-12",
        "RE-1", "RE-2", "RE-3", "JA-01", "JA-03", "JA-04", "JA-05"
      ];
      
      // Быстрый набор для точного сравнения (без нормализации)
var LABEL_SKUS_SET = {};
for (var i = 0; i < LABEL_SKUS.length; i++) {
    LABEL_SKUS_SET[LABEL_SKUS[i]] = true;
}

  
    // Создаём диалог выбора артикула и комментария
    var dlg = new Window("dialog", "Выберите артикул и комментарий");
    dlg.alignChildren = "fill";

    dlg.add("statictext", undefined, "Начните ввод и выберите из списка:");
    var input = dlg.add("edittext", undefined, "");
    input.characters = 30;

    var suggestionList = dlg.add("listbox", undefined, [], {multiselect:false});
    suggestionList.visible = false;
    suggestionList.preferredSize = [150, 200];
    
    // Чекбокс добавления суффикса "метки"
    var addLabelsChk = dlg.add("checkbox", undefined, "Добавлять «метки» после артикула");
    addLabelsChk.value = false; // по умолчанию выключен — включится автоматически при нужных артикулах
    
// Автопереключение чекбокса по введённому/выбранному артикулу
function autoToggleLabelsByArticle(name) {
    var key = (name || "").replace(/^\s+|\s+$/g, ""); // trim
    addLabelsChk.value = !!LABEL_SKUS_SET[key];
}



    // Поле для комментария (необязательно)
    dlg.add("statictext", undefined, "Комментарий (необязательно):");
    var commentInput = dlg.add("edittext", undefined, "");
    commentInput.characters = 30;

    // Кнопки
    var btnGroup = dlg.add("group");
    btnGroup.alignment = "right";
    var okBtn = btnGroup.add("button", undefined, "OK", {name:"ok"});
    var cancelBtn = btnGroup.add("button", undefined, "Отмена", {name:"cancel"});

    // Автоподбор артикула
    input.onChanging = function() {
        var q = input.text.toLowerCase();
        suggestionList.removeAll();
        if (!q) {
            suggestionList.visible = false;
        } else {
        for (var i = 0; i < articleList.length; i++) {
            var v = articleList[i];
            if (v.toLowerCase().indexOf(q) !== -1) {
                suggestionList.add("item", v);
            }
        }
        suggestionList.visible = suggestionList.items.length > 0;
    }
        autoToggleLabelsByArticle(input.text);
};
    suggestionList.onChange = function() {
        if (suggestionList.selection) {
            input.text = suggestionList.selection.text;
            suggestionList.visible = false;
            autoToggleLabelsByArticle(input.text);
        }
};

    cancelBtn.onClick = function() {
        dlg.close();
    };

    okBtn.onClick = function() {
    // 1) артикул
    var article = (input.text || "").replace(/^\s+|\s+$/g, "");
    if (!article) { 
        alert("Введите артикул!"); 
        return; 
    }

    // 2) добавить суффикс, если чекбокс включён
    if (addLabelsChk.value) {
        article += " метки";
    }        
    
        // Формируем содержимое: артикул + опциональный комментарий
        var content = article;
        if (commentInput && commentInput.text) {
            content += "\r" + commentInput.text;
        }

        // Создаём текстовый фрейм
        var tf = doc.textFrames.add();
        tf.contents = content;
        tf.textRange.characterAttributes.size = 150;

        // Позиционирование
        var tb = tf.geometricBounds; // [left, top, right, bottom]
        var textWidth = tb[2] - tb[0];
        var newX = groupLeft - offset - textWidth;
        var newY = groupTop;
        tf.position = [newX, newY];
        
            dlg.close();
    };

    dlg.center();
    dlg.show();
})();
