// addArticleBelowLastInGroup.jsx
#target illustrator

(function() {
    // Проверка документа и выделения
    if (app.documents.length === 0) {
        alert("Нет открытых документов.");
        return;
    }
    var doc = app.activeDocument;
    if (doc.selection.length !== 1) {
        alert("Пожалуйста, выделите один объект или группу.");
        return;
    }

    var sel = doc.selection[0];
    var target;
    // Если группа — берём последний по порядку элемент внутри
    if (sel.typename === "GroupItem") {
        var items = sel.pageItems;
        if (items.length === 0) {
            alert("В группе нет объектов.");
            return;
        }
        target = items[items.length - 1];
    } else {
        target = sel;
    }

    // Границы целевого объекта [left, top, right, bottom]
    var bounds = target.visibleBounds;
    var left = bounds[0], top = bounds[1], right = bounds[2], bottom = bounds[3];

    // Полный список артикулов
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

    // Создаём диалог выбора с автодополнением
    var dlg = new Window("dialog", "Выберите артикул");
    dlg.alignChildren = "fill";
    dlg.add("statictext", undefined, "Начните ввод и выберите из списка:");
    var input = dlg.add("edittext", undefined, "");
    input.characters = 30;
    var suggestionList = dlg.add("listbox", undefined, [], {multiselect:false});
    suggestionList.preferredSize = [200, 150];
    suggestionList.visible = false;

    var btns = dlg.add("group");
    btns.alignment = "right";
    var okBtn = btns.add("button", undefined, "OK", {name: "ok"});
    var cancelBtn = btns.add("button", undefined, "Отмена", {name: "cancel"});

    // Автодополнение
    input.onChanging = function() {
        var q = input.text.toLowerCase();
        suggestionList.removeAll();
        if (!q) { suggestionList.visible = false; return; }
        for (var i = 0; i < articleList.length; i++) {
            var art = articleList[i];
            if (art.toLowerCase().indexOf(q) !== -1) {
                suggestionList.add("item", art);
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

    cancelBtn.onClick = function() { dlg.close(); };
    okBtn.onClick = function() {
        if (!input.text) {
            alert("Выберите артикул из списка!");
            return;
        }
        dlg.close();
        var art = input.text;

        // Позиция текста
        var centerX = (left + right) / 2;
        var offsetPts = 6;
        var textY = bottom - offsetPts;
        var tf = doc.textFrames.pointText([centerX, textY]);
        tf.contents = art;
        tf.textRange.characterAttributes.size = 6;
        tf.paragraphs[0].paragraphAttributes.justification = Justification.CENTER;
    };

    dlg.center();
    dlg.show();
})();
