import hashlib, json, os, sys, time

OWNER = "mardymon"
REPO  = "Geek_scripts"
BRANCH = "main"
RAW = f"https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}"

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
        "version": "1.0.0",
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
