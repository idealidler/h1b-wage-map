import argparse
from collections import Counter
from datetime import date, datetime
from pathlib import Path
import re

from openpyxl import load_workbook


DEFAULT_FILE = Path(__file__).resolve().parent / "raw_data" / "LCA_Disclosure_Data_FY2026_Q3.xlsx"


def parse_filing_date(value: object) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        for date_format in ("%Y-%m-%d", "%m/%d/%Y"):
            try:
                return datetime.strptime(value.strip(), date_format).date()
            except ValueError:
                continue
        raise ValueError(f"Unrecognized RECEIVED_DATE value: {value!r}")
    if value is None:
        return None
    raise ValueError(f"Unexpected RECEIVED_DATE type: {type(value).__name__}")


def fiscal_quarter(filing_date: date, fiscal_year: int) -> int | None:
    if filing_date.year == fiscal_year - 1 and filing_date.month >= 10:
        return 1
    if filing_date.year == fiscal_year and 1 <= filing_date.month <= 9:
        return (filing_date.month - 1) // 3 + 2
    return None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Count LCA records by fiscal quarter using RECEIVED_DATE."
    )
    parser.add_argument("workbook", nargs="?", type=Path, default=DEFAULT_FILE)
    args = parser.parse_args()

    match = re.search(r"FY(\d{4})", args.workbook.name, re.IGNORECASE)
    if not match:
        raise SystemExit("Workbook filename must include a fiscal year like FY2026.")
    fiscal_year = int(match.group(1))

    workbook = load_workbook(args.workbook, read_only=True, data_only=True)
    try:
        worksheet = workbook.active
        headers = next(worksheet.iter_rows(min_row=1, max_row=1, values_only=True))
        normalized_headers = [
            str(header).strip().upper() if header is not None else ""
            for header in headers
        ]
        if "RECEIVED_DATE" not in normalized_headers:
            raise SystemExit("Workbook does not contain a RECEIVED_DATE column.")
        if "CASE_NUMBER" not in normalized_headers:
            raise SystemExit("Workbook does not contain a CASE_NUMBER column.")
        date_column = normalized_headers.index("RECEIVED_DATE") + 1
        case_column = normalized_headers.index("CASE_NUMBER") + 1

        counts = Counter()
        blank_dates = 0
        min_date = None
        max_date = None
        for row in worksheet.iter_rows(
            min_row=2, min_col=1, max_col=max(date_column, case_column), values_only=True
        ):
            case_number = row[case_column - 1]
            if case_number is None or not str(case_number).strip():
                continue
            filing_date = parse_filing_date(row[date_column - 1])
            if filing_date is None:
                blank_dates += 1
                continue
            min_date = filing_date if min_date is None or filing_date < min_date else min_date
            max_date = filing_date if max_date is None or filing_date > max_date else max_date
            quarter = fiscal_quarter(filing_date, fiscal_year)
            counts[quarter if quarter is not None else "outside"] += 1

        print(f"Workbook: {args.workbook}")
        print(f"Fiscal year: {fiscal_year} (based on RECEIVED_DATE)")
        print(f"Records: {sum(counts.values()) + blank_dates:,}")
        if min_date is not None and max_date is not None:
            print(f"RECEIVED_DATE range: {min_date} through {max_date}")
        for quarter in range(1, 5):
            print(f"Q{quarter}: {counts[quarter]:,} records")
        print(f"Outside FY{fiscal_year}: {counts['outside']:,} records")
        print(f"Blank RECEIVED_DATE: {blank_dates:,} records")
    finally:
        workbook.close()


if __name__ == "__main__":
    main()
