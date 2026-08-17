#!/usr/bin/env python3
"""Convert the licensed Sketchfab 3DS download into a web-oriented GLB.

Requires the official Blender extension "Autodesk 3D Studio (.3ds)" v3.0.1.
Run through Blender; the companion build-sketchfab.sh wrapper handles arguments
and post-processes the GLB with glTF Transform.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from pathlib import Path
from typing import Iterable

import bpy
from mathutils import Matrix, Vector


MODEL_URL = "https://sketchfab.com/3d-models/la-bombonera-boca-juniors-82204c5963b84ac593c26127ac36fbfa"
AUTHOR = "A1905 (@al1905)"
LICENSE = "CC BY 4.0"
LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/"

TRANSPARENT_TEXTURES = {"_113", "antena_m", "butaca11", "fencing_"}

# The 3DS references more texture files than the download includes. Exact files
# are preferred; these aliases retain the closest material-family treatment.
TEXTURE_ALIASES = {
    "basic_01": "Basic_Ti",
    "basic_ti": "Basic_Ti",
    "cercado_": "Fencing_",
    "fencin01": "Fencing_",
    "fencin02": "Fencing_",
    "fencing_": "Fencing_",
    "_cladd02": "_Cladd01",
    "_cladd03": "_Cladd01",
    "_cladd04": "_Cladd06",
    "_cladd05": "_Cladd06",
    "_cladd08": "_Cladd07",
    "_claddin": "_Cladd07",
    "_metal02": "_Metal01",
    "_metal03": "_Metal01",
    "_metal04": "_Metal01",
    "_metal_a": "_Metal01",
    "_metal_c": "_Metal01",
    "_metal_r": "Metal_Ro",
    "metal_01": "_Metal01",
    "metal_em": "Metal_St",
    "metal_en": "Metal_St",
    "_color_a": "Color_A0",
    "_color01": "Color_A0",
    "_color02": "Color_A0",
}


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="Source .3ds file")
    parser.add_argument("--textures", required=True, help="Texture directory")
    parser.add_argument("--output", required=True, help="Raw destination .glb")
    parser.add_argument("--report", required=True, help="Build report JSON")
    return parser.parse_args(argv)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.images):
        for datablock in list(datablocks):
            if datablock.name not in {"Render Result", "Viewer Node"}:
                datablocks.remove(datablock)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene.unit_settings.scale_length = 1.0


def world_bounds(objects: Iterable[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    if not corners:
        raise RuntimeError("Cannot calculate bounds for an empty object set")
    return (
        Vector(tuple(min(corner[axis] for corner in corners) for axis in range(3))),
        Vector(tuple(max(corner[axis] for corner in corners) for axis in range(3))),
    )


def objects_using_material(prefix: str) -> list[bpy.types.Object]:
    return [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH"
        and any(slot.material and slot.material.name.startswith(prefix) for slot in obj.material_slots)
    ]


def texture_for_material(
    material_name: str,
    textures: dict[str, Path],
) -> Path | None:
    key = material_name.lower()
    if key in textures:
        return textures[key]
    if key.startswith("popu_"):
        return textures.get("popu_")
    alias = TEXTURE_ALIASES.get(key)
    return textures.get(alias.lower()) if alias else None


def attach_textures(texture_directory: Path) -> tuple[list[dict[str, str]], list[str]]:
    textures = {
        path.stem.lower(): path
        for path in texture_directory.iterdir()
        if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png"}
    }
    linked: list[dict[str, str]] = []
    missing: list[str] = []

    for material in bpy.data.materials:
        texture_path = texture_for_material(material.name, textures)
        if texture_path is None:
            missing.append(material.name)
            continue
        material.use_nodes = True
        principled = material.node_tree.nodes.get("Principled BSDF")
        if principled is None:
            missing.append(material.name)
            continue
        image = bpy.data.images.load(str(texture_path), check_existing=True)
        image_node = material.node_tree.nodes.new("ShaderNodeTexImage")
        image_node.image = image
        image_node.label = texture_path.name
        image_node.name = f"TEX_{texture_path.stem}"
        material.node_tree.links.new(image_node.outputs["Color"], principled.inputs["Base Color"])

        if texture_path.stem.lower() in TRANSPARENT_TEXTURES:
            material.node_tree.links.new(image_node.outputs["Alpha"], principled.inputs["Alpha"])
            material.surface_render_method = "DITHERED"
            material.use_transparency_overlap = False
            material.use_backface_culling = False

        linked.append({"material": material.name, "texture": texture_path.name})
    return linked, missing


def orient_to_web_space() -> dict[str, object]:
    pitch_objects = objects_using_material("cancha_d")
    grass_objects = objects_using_material("Grass_Da")
    if not pitch_objects or not grass_objects:
        raise RuntimeError("Pitch reference materials were not found in the 3DS")

    pitch_min, pitch_max = world_bounds(pitch_objects)
    grass_min, grass_max = world_bounds(grass_objects)
    pitch_center = (pitch_min + pitch_max) * 0.5
    ground_height = grass_max.z

    # Source: Z-up, pitch length on Y, flat palcos at +X.
    # Blender output: rotate +90° so pitch length becomes X. The glTF exporter
    # maps Blender +Y to glTF -Z, leaving palcos on the expected negative Z side.
    transform = Matrix.Rotation(math.pi / 2.0, 4, "Z") @ Matrix.Translation(
        (-pitch_center.x, -pitch_center.y, -ground_height)
    )
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    original_world_matrices = {obj: obj.matrix_world.copy() for obj in mesh_objects}
    for obj in mesh_objects:
        # 3DS contains deep object parenting. Applying the transform to every
        # hierarchy level would be compounded when glTF Transform flattens it.
        # Detach while preserving world matrices, then orient each mesh once.
        obj.parent = None
        obj.matrix_world = transform @ original_world_matrices[obj]

    palcos_objects = objects_using_material("butaca11")
    final_min, final_max = world_bounds(mesh_objects)
    palcos_min, palcos_max = world_bounds(palcos_objects)
    # Convert Blender X/Y/Z bounds to glTF X/Y/Z bounds.
    gltf_min = [final_min.x, final_min.z, -final_max.y]
    gltf_max = [final_max.x, final_max.z, -final_min.y]
    palcos_gltf_z = [-palcos_max.y, -palcos_min.y]
    return {
        "pitch_source_bounds": {"min": list(pitch_min), "max": list(pitch_max)},
        "pitch_center_source": list(pitch_center),
        "ground_height_source": ground_height,
        "gltf_bbox_min": gltf_min,
        "gltf_bbox_max": gltf_max,
        "palcos_gltf_z": palcos_gltf_z,
    }


def export_glb(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_yup=True,
    )


def main() -> None:
    args = parse_args()
    source = Path(args.source).expanduser().resolve()
    texture_directory = Path(args.textures).expanduser().resolve()
    output = Path(args.output).expanduser().resolve()
    report_path = Path(args.report).expanduser().resolve()
    if source.suffix.lower() != ".3ds":
        raise SystemExit("--source must be a .3ds file")
    if output.suffix.lower() != ".glb":
        raise SystemExit("--output must be a .glb file")

    reset_scene()
    started = time.time()
    try:
        bpy.ops.import_scene.max3ds(
            filepath=str(source),
            constrain_size=0.0,
            use_scene_unit=False,
            use_image_search=False,
            use_apply_transform=True,
            use_keyframes=False,
            axis_forward="Y",
            axis_up="Z",
        )
    except AttributeError as error:
        raise RuntimeError(
            "Install and enable Blender's official Autodesk 3D Studio (.3ds) extension"
        ) from error

    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    for obj in mesh_objects:
        obj.data.calc_loop_triangles()
    source_triangles = sum(len(obj.data.loop_triangles) for obj in mesh_objects)
    source_vertices = sum(len(obj.data.vertices) for obj in mesh_objects)
    linked, missing = attach_textures(texture_directory)
    orientation = orient_to_web_space()

    scene = bpy.context.scene
    scene["source_url"] = MODEL_URL
    scene["author"] = AUTHOR
    scene["license"] = LICENSE
    scene["license_url"] = LICENSE_URL
    scene["modified"] = "Centered on pitch, rotated to web axes, materials relinked"

    export_glb(output)
    report = {
        "source": str(source),
        "source_bytes": source.stat().st_size,
        "source_meshes": len(mesh_objects),
        "source_vertices": source_vertices,
        "source_triangles": source_triangles,
        "source_materials": len(bpy.data.materials),
        "linked_materials": len(linked),
        "linked_textures": sorted({item["texture"] for item in linked}),
        "missing_texture_materials": missing,
        "raw_glb_bytes": output.stat().st_size,
        "seconds": round(time.time() - started, 2),
        "author": AUTHOR,
        "license": LICENSE,
        "source_url": MODEL_URL,
        "archive_license_file": any(
            path.is_file() and path.name.lower().startswith(("license", "licence", "copying"))
            for path in source.parent.parent.rglob("*")
        ),
        "optimized": False,
        **orientation,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("SKETCHFAB_BUILD_REPORT " + json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
