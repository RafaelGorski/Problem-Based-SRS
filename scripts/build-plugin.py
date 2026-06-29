#!/usr/bin/env python3
"""Build and validate the Problem-Based SRS plugin.

This script powers the build & release pipeline. It can be run locally or from
GitHub Actions. It performs three things:

  1. validate  - Validate plugin.json and every skills/*/SKILL.md frontmatter,
                 and (optionally) check version consistency against --expected-version.
  2. notes     - Extract the CHANGELOG.md section for a given version.
  3. package   - Bundle the distributable plugin into dist/<name>-v<version>.zip.

Usage:
  python scripts/build-plugin.py validate [--expected-version 1.3]
  python scripts/build-plugin.py notes --version 1.3
  python scripts/build-plugin.py package [--version 1.3] [--out-dir dist]
  python scripts/build-plugin.py build --version 1.3    # validate + package + notes

Exit code is non-zero on any validation failure.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import zipfile
from pathlib import Path

# Ensure UTF-8 output regardless of the host console codepage (e.g. Windows cp1252).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent
PLUGIN_MANIFEST = REPO_ROOT / ".claude-plugin" / "plugin.json"
SKILLS_DIR = REPO_ROOT / "skills"
CHANGELOG = REPO_ROOT / "CHANGELOG.md"

# Paths included in the distributable archive (relative to repo root).
# The release ships only what the agent needs at runtime: the plugin manifest,
# the agent definition, and the skills it orchestrates (plus LICENSE for
# compliance). README, CHANGELOG, AGENTS.md, lockfiles, tests, build scripts,
# and docs/helper files are intentionally excluded.
PACKAGE_INCLUDES = [
    ".claude-plugin",
    "agents",
    "skills",
    "settings.json",
    "LICENSE",
]


class BuildError(Exception):
    """Raised when validation or packaging fails."""


def _read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise BuildError(f"Required file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise BuildError(f"Invalid JSON in {path}: {exc}") from exc


def _parse_frontmatter(text: str) -> dict:
    """Parse a minimal YAML frontmatter block (key: value pairs)."""
    if not text.startswith("---"):
        raise BuildError("missing YAML frontmatter (file must start with '---')")
    end = text.find("\n---", 3)
    if end == -1:
        raise BuildError("unterminated YAML frontmatter (missing closing '---')")
    block = text[3:end].strip("\n")
    data: dict[str, str] = {}
    for line in block.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        # only consider top-level keys (no indentation)
        if line[0] in (" ", "\t"):
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data


def normalize_version(version: str) -> str:
    """Normalize versions for comparison: strip leading 'v' and trailing '.0'."""
    v = version.strip().lstrip("vV")
    parts = v.split(".")
    while len(parts) > 2 and parts[-1] == "0":
        parts.pop()
    return ".".join(parts)


def get_plugin_meta() -> dict:
    meta = _read_json(PLUGIN_MANIFEST)
    if not meta.get("name"):
        raise BuildError("plugin.json is missing required field: name")
    if not meta.get("version"):
        raise BuildError("plugin.json is missing required field: version")
    return meta


def validate(expected_version: str | None = None) -> dict:
    """Validate manifest + skills. Returns plugin meta on success."""
    errors: list[str] = []
    meta = get_plugin_meta()
    print(f"[validate] plugin: {meta['name']} v{meta['version']}")

    if expected_version is not None:
        if normalize_version(meta["version"]) != normalize_version(expected_version):
            errors.append(
                f"version mismatch: plugin.json has {meta['version']} but expected "
                f"{expected_version}"
            )

    if not SKILLS_DIR.is_dir():
        raise BuildError(f"skills directory not found: {SKILLS_DIR}")

    skill_count = 0
    for skill_dir in sorted(p for p in SKILLS_DIR.iterdir() if p.is_dir()):
        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            errors.append(f"{skill_dir.name}: missing SKILL.md")
            continue
        try:
            fm = _parse_frontmatter(skill_md.read_text(encoding="utf-8"))
        except BuildError as exc:
            errors.append(f"{skill_dir.name}/SKILL.md: {exc}")
            continue
        name = fm.get("name")
        if not name:
            errors.append(f"{skill_dir.name}/SKILL.md: frontmatter missing 'name'")
        elif name != skill_dir.name:
            errors.append(
                f"{skill_dir.name}/SKILL.md: name '{name}' does not match directory "
                f"'{skill_dir.name}'"
            )
        if not fm.get("description"):
            errors.append(f"{skill_dir.name}/SKILL.md: frontmatter missing 'description'")
        skill_count += 1
        print(f"[validate] skill OK: {skill_dir.name}")

    if skill_count == 0:
        errors.append("no skills found under skills/")

    if errors:
        raise BuildError("validation failed:\n  - " + "\n  - ".join(errors))

    print(f"[validate] success: {skill_count} skills validated")
    return meta


def extract_notes(version: str) -> str:
    """Extract the CHANGELOG.md section for the given version."""
    if not CHANGELOG.exists():
        raise BuildError(f"CHANGELOG.md not found: {CHANGELOG}")
    target = normalize_version(version)
    lines = CHANGELOG.read_text(encoding="utf-8").splitlines()
    captured: list[str] = []
    capturing = False
    for line in lines:
        if line.startswith("## "):
            if capturing:
                break
            # match headers like: ## [1.3] - 2026-03-15  or  ## 1.3
            header = line[3:].strip()
            ver_token = header.split("]")[0].lstrip("[").split(" ")[0]
            if normalize_version(ver_token) == target:
                capturing = True
                continue
        if capturing:
            captured.append(line)
    notes = "\n".join(captured).strip()
    if not notes:
        raise BuildError(
            f"no CHANGELOG.md section found for version {version}. "
            f"Add a '## [{target}] - YYYY-MM-DD' section."
        )
    return notes


def package(version: str, out_dir: Path) -> Path:
    """Create dist/<name>-v<version>.zip. Returns the archive path."""
    meta = get_plugin_meta()
    name = meta["name"]
    out_dir.mkdir(parents=True, exist_ok=True)
    archive = out_dir / f"{name}-v{normalize_version(version)}.zip"
    if archive.exists():
        archive.unlink()

    file_count = 0
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel in PACKAGE_INCLUDES:
            src = REPO_ROOT / rel
            if not src.exists():
                continue
            if src.is_file():
                zf.write(src, f"{name}/{rel}")
                file_count += 1
            else:
                for path in sorted(src.rglob("*")):
                    if path.is_file():
                        arcname = f"{name}/{path.relative_to(REPO_ROOT).as_posix()}"
                        zf.write(path, arcname)
                        file_count += 1
    print(f"[package] wrote {archive} ({file_count} files)")
    return archive


def _resolve_version(arg_version: str | None) -> str:
    if arg_version:
        return normalize_version(arg_version)
    return normalize_version(get_plugin_meta()["version"])


def _write_github_output(key: str, value: str) -> None:
    out = os.environ.get("GITHUB_OUTPUT")
    if not out:
        return
    with open(out, "a", encoding="utf-8") as fh:
        if "\n" in value:
            delim = "EOF_BUILD_PLUGIN"
            fh.write(f"{key}<<{delim}\n{value}\n{delim}\n")
        else:
            fh.write(f"{key}={value}\n")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Build & validate the plugin")
    sub = parser.add_subparsers(dest="command", required=True)

    p_val = sub.add_parser("validate", help="validate manifest and skills")
    p_val.add_argument("--expected-version", default=None)

    p_notes = sub.add_parser("notes", help="print CHANGELOG notes for a version")
    p_notes.add_argument("--version", default=None)

    p_pkg = sub.add_parser("package", help="package the distributable zip")
    p_pkg.add_argument("--version", default=None)
    p_pkg.add_argument("--out-dir", default="dist")

    p_build = sub.add_parser("build", help="validate + package + emit notes")
    p_build.add_argument("--version", default=None)
    p_build.add_argument("--out-dir", default="dist")

    args = parser.parse_args(argv)

    try:
        if args.command == "validate":
            validate(args.expected_version)
        elif args.command == "notes":
            version = _resolve_version(args.version)
            notes = extract_notes(version)
            print(notes)
            _write_github_output("notes", notes)
            _write_github_output("version", version)
        elif args.command == "package":
            version = _resolve_version(args.version)
            archive = package(version, REPO_ROOT / args.out_dir)
            _write_github_output("artifact", str(archive))
            _write_github_output("version", version)
        elif args.command == "build":
            version = _resolve_version(args.version)
            validate(expected_version=version)
            archive = package(version, REPO_ROOT / args.out_dir)
            notes = extract_notes(version)
            _write_github_output("artifact", str(archive))
            _write_github_output("version", version)
            _write_github_output("notes", notes)
            print(f"[build] success: v{version} -> {archive}")
    except BuildError as exc:
        print(f"::error::{exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
