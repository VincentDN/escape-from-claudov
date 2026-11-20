"""Build the fixed-stock raid GLB and its optional rails and magazine using Blender's offline decimator."""
from pathlib import Path
import bpy

root = Path(__file__).resolve().parents[3]
source = root / 'showcase/assets/models/weapons/stg44-2044-b.glb'
target = root / 'assets/raid-models/stg44.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
skipped = {'stock_adj_body', 'stock_adj_tube'}
for obj in list(bpy.context.scene.objects):
    if obj.name in skipped:
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    if obj.type != 'MESH':
        continue
    bpy.context.view_layer.objects.active = obj
    obj.data.materials.clear()
    decimate = obj.modifiers.new('Raid triangle budget', 'DECIMATE')
    decimate.ratio = 0.17 if obj.name in {'hull', 'stock_fixed', 'handguard', 'mag_25', 'mag_40', 'grip'} else 0.25
    decimate.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=decimate.name)
target.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', export_materials='NONE',
                         export_texcoords=False, export_normals=True, export_animations=False)
