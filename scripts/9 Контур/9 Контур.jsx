// CombinedScripts.jsx
#target illustrator

// 1) Новый контур (бывший offsetAndReplace/main) :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}
function offsetAndReplace() {
  if (!documents.length) {
    alert('Error\nPlease open a document to work on.');
    return;
  }
  
  var partitions = partitionSelect(selection);
  var oldPathSelect = partitions.pathSel;
  var oldNonPathSelect = partitions.nonPathSel;

  if (!oldPathSelect.length) {
    alert('Error\nPlease select at least one path object.');
    return;
  } else {
    for (var i = oldNonPathSelect.length - 1; i >= 0; i--) {
      oldNonPathSelect[i].selected = false;
    }
  }

  app.executeMenuCommand("OffsetPath v23");

  if (!isEquals(oldPathSelect, partitionSelect(selection).pathSel)) {
    for (var i = oldPathSelect.length - 1; i >= 0; i--) {
      oldPathSelect[i].remove();
    }
  }

  for (var i = oldNonPathSelect.length - 1; i >= 0; i--) {
    oldNonPathSelect[i].selected = true;
  }
}

// Вспомогательные функции для offsetAndReplace :contentReference[oaicite:2]{index=2}&#8203;:contentReference[oaicite:3]{index=3}
function partitionSelect(sel) {
  var partitions = { pathSel: [], nonPathSel: [] };
  for (var i = sel.length - 1; i >= 0; i--) {
    switch (sel[i].typename) {
      case "GroupItem":
        var sub = partitionSelect(sel[i].pageItems);
        partitions.pathSel = partitions.pathSel.concat(sub.pathSel);
        partitions.nonPathSel = partitions.nonPathSel.concat(sub.nonPathSel);
        break;
      case "CompoundPathItem":
      case "PathItem":
        partitions.pathSel.push(sel[i]);
        break;
      default:
        partitions.nonPathSel.push(sel[i]);
    }
  }
  return partitions;
}

function isEquals(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (var i = arr1.length - 1; i >= 0; i--) {
    var found = false;
    for (var j = arr2.length - 1; j >= 0; j--) {
      if (arr1[i] === arr2[j]) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

// 2) Объединение и освобождение (uniteAndRelease) :contentReference[oaicite:4]{index=4}&#8203;:contentReference[oaicite:5]{index=5}
function uniteAndRelease() {
  var doc = app.activeDocument;
  if (!doc || doc.selection.length < 2) {
    alert("Ошибка: выделите как минимум два векторных объекта.");
    return;
  }

  // сгруппировать выделение
  var tempGroup = doc.groupItems.add();
  var sel = doc.selection;
  for (var i = sel.length - 1; i >= 0; i--) {
    sel[i].move(tempGroup, ElementPlacement.PLACEATEND);
  }
  tempGroup.selected = true;

  // Pathfinder Unite + Expand
  app.executeMenuCommand('Live Pathfinder Add');
  app.executeMenuCommand('expandStyle');
  app.executeMenuCommand('expand');

  // Освободить compound path
  var resultItem = doc.selection[0];
  if (resultItem.typename === "CompoundPathItem") {
    resultItem.releaseCompoundPath();
  } else if (resultItem.typename === "GroupItem") {
    for (var j = resultItem.compoundPathItems.length - 1; j >= 0; j--) {
      resultItem.compoundPathItems[j].releaseCompoundPath();
    }
  }

  // Повторно объединить внутри родительской группы
  var parent = tempGroup.parent;
  var itemsToMerge = [];
  var allItems = parent.pageItems;
  for (var k = 0; k < allItems.length; k++) {
    if (allItems[k].selected && allItems[k].typename === "PathItem") {
      itemsToMerge.push(allItems[k]);
    }
  }
  if (itemsToMerge.length > 1) {
    var tempGroup2 = parent.groupItems.add();
    for (var m = itemsToMerge.length - 1; m >= 0; m--) {
      itemsToMerge[m].move(tempGroup2, ElementPlacement.PLACEATEND);
    }
    tempGroup2.selected = true;
    app.executeMenuCommand('Live Pathfinder Add');
    app.executeMenuCommand('expandStyle');
    app.executeMenuCommand('expand');
  }
}

// 3) Поменять заливку на обводку (changeFillToStroke) :contentReference[oaicite:6]{index=6}&#8203;:contentReference[oaicite:7]{index=7}
function changeFillToStroke() {
  if (app.documents.length === 0) {
    alert("Нет открытого документа.");
    return;
  }
  var doc = app.activeDocument;
  var sel = doc.selection;
  if (!(sel instanceof Array) || sel.length === 0) {
    alert("Выберите один или несколько объектов.");
    return;
  }
  for (var i = 0; i < sel.length; i++) {
    processItem(sel[i]);
  }
}

function processItem(item) {
  if (item.typename === "GroupItem") {
    for (var i = 0; i < item.pageItems.length; i++) {
      processItem(item.pageItems[i]);
    }
    return;
  }
  if (item.typename === "CompoundPathItem") {
    for (var i = 0; i < item.pathItems.length; i++) {
      processItem(item.pathItems[i]);
    }
    return;
  }
  if (item.typename === "PathItem" && item.filled) {
    item.stroked     = true;
    item.strokeColor = item.fillColor;
    item.strokeWidth = 1;  // при желании скорректируйте толщину
    item.filled      = false;
  }
}

// Последовательный запуск всех трёх функций
try { offsetAndReplace(); } catch (e) { /* тихо игнорируем */ }
try { uniteAndRelease();   } catch (e) { /* тихо игнорируем */ }
try { changeFillToStroke();} catch (e) { /* тихо игнорируем */ }
