// removeWhiteFill_fixed.jsx
#target illustrator
function main() {
    if (!app.documents.length) {
        alert("Нет открытых документов.");
        return;
    }
    var doc = app.activeDocument;
    var sel = doc.selection;
    if (!(sel instanceof Array) || sel.length === 0) {
        alert("Пожалуйста, выберите объекты для обработки.");
        return;
    }
    // Обходим выделение с конца, чтобы корректно удалять элементы
    for (var i = sel.length - 1; i >= 0; i--) {
        processItem(sel[i]);
    }
}

function processItem(item) {
    var type = item.typename;
    if (type === "GroupItem") {
        for (var i = item.pageItems.length - 1; i >= 0; i--) {
            processItem(item.pageItems[i]);
        }
    } else if (type === "CompoundPathItem") {
        for (var i = item.pathItems.length - 1; i >= 0; i--) {
            processItem(item.pathItems[i]);
        }
    } else if (type === "PathItem") {
        if (item.filled && isWhite(item.fillColor)) {
            item.remove();
        }
    }
    // При необходимости вы можете добавить поддержку других типов (TextFrame, SymbolItem и т.п.)
}

function isWhite(color) {
    switch (color.typename) {
        case "RGBColor":
            // белый в RGB
            return color.red === 255 && color.green === 255 && color.blue === 255;
        case "CMYKColor":
            // белый в CMYK
            return color.cyan === 0 && color.magenta === 0 && color.yellow === 0 && color.black === 0;
        case "GrayColor":
            // в GrayColor.gray — это % чёрного, так что 0 = белый
            return color.gray === 0;
        default:
            return false;
    }
}

// Запуск
main();
