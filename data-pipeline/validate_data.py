import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "site" / "public" / "jobs-2026-27"
REQUIRED_FIELDS = {"c", "s", "l1", "l2", "l3", "l4"}


def main() -> None:
    manifest_path = DATA_DIR / "data-manifest.json"
    index_path = DATA_DIR / "job-index.json"
    if not manifest_path.exists() or not index_path.exists():
        raise SystemExit("Missing data-manifest.json or job-index.json")

    manifest = json.loads(manifest_path.read_text())
    index = json.loads(index_path.read_text())
    soc_files = sorted(DATA_DIR.glob("*.json"))
    soc_files = [path for path in soc_files if path.name not in {"data-manifest.json", "job-index.json"}]

    expected_soc_count = int(manifest["soc_count"])
    if len(index) != expected_soc_count or len(soc_files) != expected_soc_count:
        raise SystemExit(
            f"SOC count mismatch: manifest={expected_soc_count}, index={len(index)}, files={len(soc_files)}"
        )

    checked_records = 0
    indexed_codes = {str(item["soc"]).replace(".json", "") for item in index}
    file_codes = {path.stem for path in soc_files}
    if indexed_codes != file_codes:
        raise SystemExit("job-index.json does not match generated SOC files")

    for path in soc_files:
        payload = json.loads(path.read_text())
        if not isinstance(payload, dict) or not payload:
            raise SystemExit(f"Empty or invalid wage file: {path.name}")
        for fips, record in payload.items():
            if not REQUIRED_FIELDS.issubset(record):
                raise SystemExit(f"Missing wage fields in {path.name}:{fips}")
            levels = [record[field] for field in ("l1", "l2", "l3", "l4")]
            if any(not isinstance(level, int) or level < 0 for level in levels):
                raise SystemExit(f"Invalid wage values in {path.name}:{fips}")
            if levels != sorted(levels):
                raise SystemExit(f"Wage levels are not ordered in {path.name}:{fips}")
            checked_records += 1

    print(f"Validated {len(soc_files)} SOC files and {checked_records} county records.")
    print(f"Dataset: {manifest['dataset']} ({manifest['effective_period']})")


if __name__ == "__main__":
    main()
