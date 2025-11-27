# -*- coding: utf-8 -*-
from pathlib import Path, PurePosixPath
import subprocess, os, json, hashlib, time, sys

# === БАЗОВЫЕ НАСТРОЙКИ РЕПО ===
OWNER  = "mardymon"
REPO   = "Geek_scripts"
BRANCH = "main"

# Корень репозитория (папка уровнем выше tools/)
REPO_ROOT = Path(__file__).resolve().parents[1]

# === ОПИСАНИЕ ПАКЕТОВ (редактируй версии/описания тут) ===
PACKAGES = [
    {
        "id": "1 Кол-во",
        "name": "1 Кол-во",
        "version": "1.0.1",
        "description": "Создание копий макетов",
        "src_dir": "scripts/1 Кол-во",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "2 Разделить",
        "name": "2 Разделить",
        "version": "1.0.0",
        "description": "Отделить картинку от контура",
        "src_dir": "scripts/2 Разделить",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "3 Name лист",
        "name": "3 Name лист",
        "version": "1.0.0",
        "description": "Подписать лист печати",
        "src_dir": "scripts/3 Name лист",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "4 Артикул под меткой",
        "name": "4 Артикул под меткой",
        "version": "1.0.0",
        "description": "Подписать артикул под меткой печати",
        "src_dir": "scripts/4 Артикул под меткой",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "5 Артикул слева",
        "name": "5 Артикул слева",
        "version": "1.0.0",
        "description": "Подписать артикул для листа печати",
        "src_dir": "scripts/5 Артикул слева",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "6 Размер макетов",
        "name": "6 Размер макетов",
        "version": "1.0.2",
        "description": "Подписать размеры у макетов",
        "src_dir": "scripts/6 Размер макетов",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "7 Трассировка",
        "name": "7 Трассировка",
        "version": "1.0.0",
        "description": "Трассировать изображение для обработки",
        "src_dir": "scripts/7 Трассировка",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "8 Удалить белый",
        "name": "8 Удалить белый",
        "version": "1.0.0",
        "description": "Удалить белый фон",
        "src_dir": "scripts/8 Удалить белый",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "9 Контур",
        "name": "9 Контур",
        "version": "1.0.0",
        "description": "Создать контур макета",
        "src_dir": "scripts/9 Контур",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "91 Перенос на новый слой",
        "name": "91 Перенос на новый слой",
        "version": "1.0.0",
        "description": "Перенести объект на новый слой",
        "src_dir": "scripts/91 Перенос на новый слой",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "92 Изображение",
        "name": "92 Изображение",
        "version": "1.0.0",
        "description": "Подогнать размер у группы изображений",
        "src_dir": "scripts/92 Изображение",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "93 Артикул под макетом",
        "name": "93 Артикул под макетом",
        "version": "1.0.0",
        "description": "Подписать артикул у макета",
        "src_dir": "scripts/93 Артикул под макетом",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "94 Распределение",
        "name": "94 Распределение",
        "version": "1.0.0",
        "description": "Разложить картинки",
        "src_dir": "scripts/94 Распределение",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "95 Разложить лист",
        "name": "95 Разложить лист",
        "version": "1.0.0",
        "description": "Разложить лист по слоям",
        "src_dir": "scripts/95 Разложить лист",
        "dest_subdir": "",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    }
]

# === СЛУЖЕБНЫЕ ФУНКЦИИ ===

def _resolve_git_dir(repo_root: Path) -> Path | None:
    """
    Возвращает путь к папке .git:
    - если .git — каталог, возвращаем его
    - если .git — файл с 'gitdir: <path>', возвращаем указанный путь (относительный -> абсолютный)
    """
    dotgit = repo_root / ".git"
    if dotgit.is_dir():
        return dotgit
    if dotgit.is_file():
        txt = dotgit.read_text(encoding="utf-8").strip()
        if txt.lower().startswith("gitdir:"):
            p = txt.split(":", 1)[1].strip()
            pth = Path(p)
            if not pth.is_absolute():
                pth = (repo_root / pth).resolve()
            return pth
    return None

def get_rev() -> str:
    """Возвращает SHA текущего коммита (HEAD). Пытаемся через git, затем читаем .git, иначе ветка."""
    # 1) git CLI
    try:
        return subprocess.check_output(
            ["git", "-C", str(REPO_ROOT), "rev-parse", "HEAD"],
            text=True
        ).strip()
    except Exception:
        pass

    # 2) читаем .git вручную
    git_dir = _resolve_git_dir(REPO_ROOT)
    if git_dir:
        head_path = git_dir / "HEAD"
        if head_path.exists():
            head = head_path.read_text(encoding="utf-8").strip()
            if head.startswith("ref:"):
                ref = head.split(" ", 1)[1].strip()
                ref_path = git_dir / ref
                if ref_path.exists():
                    return ref_path.read_text(encoding="utf-8").strip()
            else:
                # В HEAD уже сам SHA
                return head

    # 3) фолбэк — имя ветки
    return BRANCH

REV = get_rev()
RAW = f"https://cdn.jsdelivr.net/gh/{OWNER}/{REPO}@{REV}"

def git_bytes(rel_posix: str) -> bytes:
    """
    Возвращает БАЙТЫ ФАЙЛА из git-объекта (как их отдаёт raw/jsDelivr).
    Если git недоступен (редко), читаем файл с диска как запасной вариант.
    """
    try:
        return subprocess.check_output(
            ["git", "-C", str(REPO_ROOT), "show", f"{REV}:{rel_posix}"]
        )
    except Exception:
        return (REPO_ROOT / rel_posix).read_bytes()

def file_entry(rel_fs: Path) -> dict:
    """Собирает запись о файле для manifest.json (URL с @REV и корректный SHA)."""
    rel_posix = rel_fs.as_posix()
    data = git_bytes(rel_posix)                       # ← байты из git → правильный SHA
    sha = hashlib.sha256(data).hexdigest()
    return {
        "path": rel_posix,
        "sha256": sha,
        "url": f"{RAW}/{rel_posix}"
    }

def build_package(p: dict) -> dict:
    src_dir = (REPO_ROOT / p["src_dir"]).resolve()
    if not src_dir.exists():
        raise FileNotFoundError(f"Не найдена папка {src_dir}")

    files = []
    # Подготовим иконку (если есть) — добавим отдельно
    icon_rel = p.get("icon_rel")
    icon_abs = (src_dir / icon_rel).resolve() if icon_rel else None

    # Добавляем все файлы из src_dir (кроме иконки, чтобы не дублировать)
    for f in src_dir.rglob("*"):
        if f.is_file():
            if icon_abs and f.resolve() == icon_abs:
                continue
            rel_fs = f.relative_to(REPO_ROOT)
            files.append(file_entry(rel_fs))

    out = {
        "id": p["id"],
        "name": p["name"],
        "version": p["version"],
        "description": p.get("description", ""),
        "dest_subdir": p.get("dest_subdir", ""),
        "files": files
    }
    if "min_ai" in p:
        out["min_ai"] = p["min_ai"]

    # Иконка, если указана
    if icon_rel:
        rel_icon = PurePosixPath(p["src_dir"]) / PurePosixPath(icon_rel)
        out["icon"] = f"{RAW}/{rel_icon.as_posix()}"

    return out

def main() -> int:
    manifest = {
        "manifest_version": 1,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "packages": [build_package(p) for p in PACKAGES]
    }
    out_path = REPO_ROOT / "manifest.json"
    out_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"manifest.json обновлён: {out_path}")
    print(f"REV: {REV}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
