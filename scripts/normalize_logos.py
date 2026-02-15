#!/usr/bin/env python3
"""
Batch-normalize SVG logo heights.

Workflow:
1) Rename <assets_root>/<logos_dir> -> <logos_dir>-bak
2) Create a new <logos_dir>
3) Scale every SVG proportionally so height matches reference SVG height
4) Write outputs to the new <logos_dir>
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path
import xml.etree.ElementTree as ET


LENGTH_RE = re.compile(r"^\s*([+-]?\d*\.?\d+)\s*([a-zA-Z%]*)\s*$")


def parse_length(value: str | None) -> tuple[float | None, str]:
    if not value:
        return None, ""
    match = LENGTH_RE.match(value)
    if not match:
        return None, ""
    return float(match.group(1)), match.group(2)


def parse_viewbox(root: ET.Element) -> tuple[float | None, float | None]:
    view_box = root.attrib.get("viewBox")
    if not view_box:
        return None, None
    parts = re.split(r"[\s,]+", view_box.strip())
    if len(parts) != 4:
        return None, None
    try:
        return float(parts[2]), float(parts[3])
    except ValueError:
        return None, None


def fmt_number(value: float) -> str:
    text = f"{value:.6f}".rstrip("0").rstrip(".")
    return text if text else "0"


def get_svg_size(root: ET.Element) -> tuple[float | None, float | None, str]:
    width, width_unit = parse_length(root.attrib.get("width"))
    height, height_unit = parse_length(root.attrib.get("height"))
    vb_width, vb_height = parse_viewbox(root)

    if width is None:
        width = vb_width
    if height is None:
        height = vb_height

    unit = height_unit or width_unit or ""
    return width, height, unit


def find_reference_svg(directory: Path, reference_name: str) -> Path:
    files = [p for p in directory.iterdir() if p.is_file() and p.suffix.lower() == ".svg"]
    for file in files:
        if file.name.lower() == reference_name.lower():
            return file

    if reference_name.lower() == "canon.svg":
        fallback = ["Canon-black.svg", "Canon Logo.svg", "Canon-white.svg"]
        for candidate in fallback:
            for file in files:
                if file.name.lower() == candidate.lower():
                    return file

    raise FileNotFoundError(
        f"Reference SVG '{reference_name}' not found in: {directory}"
    )


def scale_svg_to_height(source: Path, output: Path, target_height: float) -> None:
    tree = ET.parse(source)
    root = tree.getroot()

    # Keep original default namespace serialization stable.
    if root.tag.startswith("{"):
        namespace = root.tag[1:].split("}", 1)[0]
        ET.register_namespace("", namespace)

    width, height, unit = get_svg_size(root)
    if height is None or height <= 0:
        raise ValueError(f"Cannot determine valid height for: {source}")

    if width is None:
        raise ValueError(f"Cannot determine valid width for: {source}")

    scale = target_height / height
    new_width = width * scale

    root.set("width", f"{fmt_number(new_width)}{unit}")
    root.set("height", f"{fmt_number(target_height)}{unit}")

    output.parent.mkdir(parents=True, exist_ok=True)
    tree.write(output, encoding="utf-8", xml_declaration=True)


def process_logos(
    assets_root: Path,
    logos_dir_name: str,
    reference_name: str,
    backup_suffix: str,
    force: bool,
) -> None:
    logos_dir = assets_root / logos_dir_name
    backup_dir = assets_root / f"{logos_dir_name}{backup_suffix}"

    if not logos_dir.exists():
        raise FileNotFoundError(f"Logos directory not found: {logos_dir}")

    if backup_dir.exists():
        if not force:
            raise FileExistsError(
                f"Backup directory already exists: {backup_dir} (use --force to overwrite)"
            )
        shutil.rmtree(backup_dir)

    logos_dir.rename(backup_dir)
    logos_dir.mkdir(parents=True, exist_ok=True)

    reference_file = find_reference_svg(backup_dir, reference_name)
    ref_tree = ET.parse(reference_file)
    ref_root = ref_tree.getroot()
    _, target_height, _ = get_svg_size(ref_root)
    if target_height is None or target_height <= 0:
        raise ValueError(f"Reference SVG has invalid height: {reference_file}")

    svg_files = sorted(
        [p for p in backup_dir.iterdir() if p.is_file() and p.suffix.lower() == ".svg"],
        key=lambda p: p.name.lower(),
    )

    for svg_file in svg_files:
        out_file = logos_dir / svg_file.name
        scale_svg_to_height(svg_file, out_file, target_height)

    print(f"Done. Backup: {backup_dir}")
    print(f"Done. Output: {logos_dir}")
    print(f"Reference: {reference_file.name} (height={fmt_number(target_height)})")
    print(f"Processed SVG count: {len(svg_files)}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Rename logos dir to backup and normalize SVG heights."
    )
    parser.add_argument(
        "--assets-root",
        default="./src/assets",
        help="Assets root directory (default: ./src/assets)",
    )
    parser.add_argument(
        "--logos-dir",
        default="camera_logos",
        help="Logos directory name under assets root (default: camera_logos)",
    )
    parser.add_argument(
        "--reference",
        default="canon.svg",
        help="Reference SVG filename (default: canon.svg)",
    )
    parser.add_argument(
        "--backup-suffix",
        default="-bak",
        help="Backup suffix appended to logos dir (default: -bak)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing backup directory if it exists",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        process_logos(
            assets_root=Path(args.assets_root),
            logos_dir_name=args.logos_dir,
            reference_name=args.reference,
            backup_suffix=args.backup_suffix,
            force=args.force,
        )
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
