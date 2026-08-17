# Build the Sketchfab Bombonera model

This pipeline converts the licensed Sketchfab download into the only stadium
asset used by the web scene. It imports the original 3DS archive in Blender,
re-links the included textures, aligns the playing field with the Three.js
scene, and optimizes the result for the web with glTF Transform.

## Requirements

- Blender with the official `Autodesk 3D Studio (.3ds)` extension enabled.
- The original Sketchfab archive downloaded locally.
- Frontend dependencies installed so `front/node_modules/.bin/gltf-transform`
  is available.

The source model is [La Bombonera - Boca Juniors](https://sketchfab.com/3d-models/la-bombonera-boca-juniors-82204c5963b84ac593c26127ac36fbfa)
by [A1905 (@al1905)](https://sketchfab.com/al1905), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Build

```bash
SKETCHFAB_SOURCE_ROOT=/absolute/path/to/la-bombonera-boca-juniors \
  ./tools/blender/build-sketchfab.sh
```

The wrapper accepts optional output and report paths as its first and second
arguments. `BLENDER_BIN`, `SKETCHFAB_SOURCE_3DS`, and `SKETCHFAB_TEXTURES` can
override their respective defaults.

The command writes:

- `front/public/models/bombonera/bombonera-sketchfab.glb`
- `front/public/models/bombonera/bombonera-sketchfab.report.json`

The output uses Meshopt compression, WebP textures limited to 1024 px, and a
geometry simplification ratio selected for interactive browser rendering. The
JSON report records provenance, source statistics, texture coverage, optimized
bounds, draw calls, and triangle counts.

See `front/public/models/bombonera/ATTRIBUTION.md` for the attribution that must
remain distributed with the model.
