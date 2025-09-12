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
        "id": "export-to-png",
        "name": "Export to PNG",
        "version": "1.0.0",
        "description": "Пакетный экспорт артбордов в PNG.",
        "src_dir": "scripts/export-to-png",
        "dest_subdir": "Export",
        "min_ai": "25.0",
        "icon_rel": "icon.png",  # файл иконки внутри src_dir (опционально)
    },
    {
        "id": "rename-artboards",
        "name": "Rename Artboards",
        "version": "1.0.6",  # ← ставь здесь актуальную версию пакета
        "description": "Переименование артбордов по шаблону.",
        "src_dir": "scripts/rename-artboards",
        "dest_subdir": ""
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
