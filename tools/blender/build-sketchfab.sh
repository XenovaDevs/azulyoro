#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
BLENDER_BIN="${BLENDER_BIN:-$(command -v blender || true)}"
SOURCE_ROOT="${SKETCHFAB_SOURCE_ROOT:-/home/max/Descargas/la-bombonera-boca-juniors}"
SOURCE_3DS="${SKETCHFAB_SOURCE_3DS:-$SOURCE_ROOT/source/bombonera  liviana suir.3ds}"
TEXTURES="${SKETCHFAB_TEXTURES:-$SOURCE_ROOT/textures}"
OUTPUT="${1:-$REPO_ROOT/front/public/models/bombonera/bombonera-sketchfab.glb}"
REPORT="${2:-$REPO_ROOT/front/public/models/bombonera/bombonera-sketchfab.report.json}"
GLTF_TRANSFORM="$REPO_ROOT/front/node_modules/.bin/gltf-transform"

[[ -n "$BLENDER_BIN" ]] || { echo "Blender was not found; set BLENDER_BIN." >&2; exit 1; }
[[ -f "$SOURCE_3DS" ]] || { echo "3DS source not found: $SOURCE_3DS" >&2; exit 1; }
[[ -d "$TEXTURES" ]] || { echo "Texture directory not found: $TEXTURES" >&2; exit 1; }
[[ -x "$GLTF_TRANSFORM" ]] || { echo "glTF Transform CLI is required." >&2; exit 1; }

mkdir -p "$(dirname -- "$OUTPUT")" "$(dirname -- "$REPORT")"
rm -f -- "$OUTPUT" "$REPORT"

"$BLENDER_BIN" \
  --background \
  --python-exit-code 1 \
  --python "$SCRIPT_DIR/convert_sketchfab.py" \
  -- \
  --source "$SOURCE_3DS" \
  --textures "$TEXTURES" \
  --output "$OUTPUT" \
  --report "$REPORT"

[[ -s "$OUTPUT" ]] || { echo "Blender did not create a GLB." >&2; exit 1; }
RAW_OUTPUT="${OUTPUT%.glb}.raw.glb"
mv -- "$OUTPUT" "$RAW_OUTPUT"
"$GLTF_TRANSFORM" optimize "$RAW_OUTPUT" "$OUTPUT" \
  --compress meshopt \
  --simplify-ratio 0.35 \
  --simplify-error 0.003 \
  --texture-compress webp \
  --texture-size 1024
rm -f -- "$RAW_OUTPUT"

INSPECT_CSV="$("$GLTF_TRANSFORM" inspect "$OUTPUT" --format=csv)"
OUTPUT="$OUTPUT" REPORT="$REPORT" INSPECT_CSV="$INSPECT_CSV" python3 - <<'PY'
import csv
import json
import os
from pathlib import Path

output = Path(os.environ["OUTPUT"])
report_path = Path(os.environ["REPORT"])
report = json.loads(report_path.read_text(encoding="utf-8"))
lines = os.environ["INSPECT_CSV"].splitlines()
header_index = next(
    (index for index, line in enumerate(lines) if line.startswith("#,name,mode,meshPrimitives")),
    None,
)
rows = []
if header_index is not None:
    reader = csv.reader(lines[header_index:])
    next(reader)
    for row in reader:
        if not row or not row[0].isdigit():
            break
        rows.append(row)
report.update(
    {
        "bytes": output.stat().st_size,
        "optimized": True,
        "compression": "meshopt",
        "texture_compression": "webp",
        "texture_max_size": 1024,
        "simplify_ratio": 0.35,
        "simplify_error": 0.003,
        "optimized_meshes": len(rows),
        "draw_calls": sum(int(row[3]) for row in rows),
        "optimized_triangles": sum(int(row[4]) for row in rows),
    }
)
scene_header = next(
    (index for index, line in enumerate(lines) if line.startswith("#,name,rootName,bboxMin")),
    None,
)
if scene_header is not None:
    scene_reader = csv.reader(lines[scene_header:])
    next(scene_reader)
    scene_row = next(scene_reader, None)
    if scene_row and scene_row[0].isdigit():
        report["optimized_bbox_min"] = [float(value) for value in scene_row[3].split(", ")]
        report["optimized_bbox_max"] = [float(value) for value in scene_row[4].split(", ")]
report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
PY

echo "Generated: $OUTPUT"
echo "Report:    $REPORT"
