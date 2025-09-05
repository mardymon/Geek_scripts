from pathlib import Path, PurePosixPath
import subprocess, os, json, hashlib, time, sys

OWNER  = "mardymon"
REPO   = "Geek_scripts"
BRANCH = "main"

# Корень репозитория = папка уровнем выше tools/
REPO_ROOT = Path(__file__).resolve().parents[1]

def get_rev():
    """
    Возвращает SHA текущего коммита:
    1) пробуем через git -C <repo> rev-parse HEAD
    2) если git недоступен — читаем .git/HEAD и файл ссылки
    3) в худшем случае — возвращаем имя ветки (main)
    """
    # 1) git CLI
    try:
        return subprocess.check_output(
            ["git", "-C", str(REPO_ROOT), "rev-parse", "HEAD"],
            text=True
        ).strip()
    except Exception:
        pass

    # 2) .git/HEAD
    head_path = REPO_ROOT / ".git" / "HEAD"
    if head_path.exists():
        head = head_path.read_text(encoding="utf-8").strip()
        if head.startswith("ref:"):
            ref = head.split(" ", 1)[1].strip()
            ref_path = REPO_ROOT / ".git" / ref
            if ref_path.exists():
                return ref_path.read_text(encoding="utf-8").strip()
        else:
            # В HEAD уже напрямую SHA
            return head

    # 3) fallback
    return BRANCH

REV = get_rev()

# Все файлы/иконки будут указывать на jsDelivr c фиксированным коммитом:
RAW = f"https://cdn.jsdelivr.net/gh/{OWNER}/{REPO}@{REV}"


# ОПИШИТЕ ПАКЕТЫ ЗДЕСЬ (добавляйте по мере надобности)
PACKAGES = [
    {
        "id": "export-to-png",
        "name": "Export to PNG",
        "version": "1.0.0",
        "description": "Пакетный экспорт артбордов в PNG.",
        "src_dir": "scripts/export-to-png",
        "dest_subdir": "Export",
        "icon_rel": "icon.png",    # можно убрать, если нет иконки
        "min_ai": "25.0"
    },
    {
        "id": "rename-artboards",
        "name": "Rename Artboards",
        "version": "1.0.2",
        "description": "Переименование артбордов по шаблону.",
        "src_dir": "scripts/rename-artboards",
        "dest_subdir": ""
    }
]

def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()

def main():
    root = os.getcwd()
    out = {
        "manifest_version": 1,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "packages": []
    }
    for pkg in PACKAGES:
        src_dir = os.path.join(root, pkg["src_dir"])
        files = []
        for base, _, names in os.walk(src_dir):
            for n in names:
                p = os.path.join(base, n)
                rel = os.path.relpath(p, root).replace("\\", "/")
                files.append({
                    "path": rel,
                    "sha256": sha256(p),
                    "url": f"{RAW}/{rel}"
                })
        entry = {
            "id": pkg["id"],
            "name": pkg["name"],
            "version": pkg["version"],
            "description": pkg.get("description",""),
            "dest_subdir": pkg.get("dest_subdir",""),
            "files": files
        }
        if "min_ai" in pkg: entry["min_ai"] = pkg["min_ai"]
        if "icon_rel" in pkg: entry["icon"] = f"{RAW}/{pkg['src_dir']}/{pkg['icon_rel']}"
        out["packages"].append(entry)
    with open("manifest.json","w",encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("→ manifest.json готов.")

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.dirname(__file__)))  # перейти в корень репо
    sys.exit(main())
