# Icônes 3D du thème « futur ».  blender -b -P icons.py -- <dossier de sortie> [taille] [nom,nom…]
import bpy, math, sys, os
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
OUT = args[0]; SIZE = int(args[1]) if len(args) > 1 else 320; ONLY = args[2].split(",") if len(args) > 2 else None
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
R = math.radians

def mat(name, color, rough=0.22, metal=0.0, emit=None, strength=0.0, coat=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    def s(k, v):
        if k in b.inputs: b.inputs[k].default_value = v
    s("Base Color", (*color, 1)); s("Roughness", rough); s("Metallic", metal); s("Coat Weight", coat); s("Coat Roughness", 0.06)
    if emit: s("Emission Color", (*emit, 1)); s("Emission Strength", strength)
    return m

M = dict(
    blue=mat("bleu", (0.02, 0.16, 0.90)), white=mat("blanc", (0.86, 0.89, 0.96), rough=0.3), grey=mat("gris", (0.25, 0.28, 0.36), rough=0.35, metal=0.8),
    dark=mat("sombre", (0.006, 0.008, 0.03), rough=0.3, coat=0.3), red=mat("rouge", (0.85, 0.04, 0.05)), green=mat("vert", (0.03, 0.62, 0.22)),
    yellow=mat("jaune", (1.0, 0.62, 0.03)), orange=mat("orange", (1.0, 0.25, 0.03)), purple=mat("violet", (0.32, 0.12, 0.85)), pink=mat("rose", (0.95, 0.12, 0.5)),
    gold=mat("or", (1.0, 0.6, 0.08), rough=0.2, metal=1.0), sky=mat("ciel", (0.35, 0.75, 1.0), rough=0.1),
    cyanE=mat("cyanE", (0.0, 0.5, 0.6), emit=(0.05, 0.85, 1.0), strength=4.5, coat=0), pinkE=mat("roseE", (0.9, 0.1, 0.6), emit=(1.0, 0.08, 0.55), strength=2.2, coat=0),
    yellowE=mat("jauneE", (1.0, 0.7, 0.05), emit=(1.0, 0.62, 0.04), strength=1.6), orangeE=mat("orangeE", (1.0, 0.3, 0.03), emit=(1.0, 0.25, 0.02), strength=2.5, coat=0),
    greenE=mat("vertE", (0.1, 0.9, 0.3), emit=(0.15, 1.0, 0.35), strength=2.5, coat=0),
)

def fin(o, m, sub=0):
    if hasattr(o.data, "polygons"):
        for p in o.data.polygons: p.use_smooth = True
    if sub:
        md = o.modifiers.new("sub", "SUBSURF"); md.levels = sub; md.render_levels = sub
    o.data.materials.append(M[m]); return o
def box(loc, size, bevel, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object
    o.scale = size; bpy.ops.object.transform_apply(scale=True)
    md = o.modifiers.new("bevel", "BEVEL"); md.width = bevel; md.segments = 10
    return fin(o, m, 1)
def sph(loc, scale, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1, location=loc, rotation=rot); o = bpy.context.object
    o.scale = scale if isinstance(scale, tuple) else (scale,) * 3; return fin(o, m)
def cyl(loc, r, depth, m, rot=(0, 0, 0), verts=64, r2=None, bevel=True):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    if bevel:
        md = o.modifiers.new("bevel", "BEVEL"); md.width = min(r, depth) * 0.18; md.segments = 5; md.limit_method = "ANGLE"
    if verts < 12:
        o.data.materials.append(M[m]); return o
    return fin(o, m)
def torus(loc, big, small, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=big, minor_radius=small, major_segments=72, minor_segments=20, location=loc, rotation=rot); return fin(bpy.context.object, m)
def poly(pts, depth, m, loc=(0, 0, 0), bevel=0.05, rot=(0, 0, 0)):
    me = bpy.data.meshes.new("poly"); me.from_pydata([(x, 0, z) for x, z in pts], [], [list(range(len(pts)))]); me.update()
    o = bpy.data.objects.new("poly", me); scene.collection.objects.link(o); o.location = loc; o.rotation_euler = rot
    md = o.modifiers.new("ep", "SOLIDIFY"); md.thickness = depth; md.offset = 0
    md = o.modifiers.new("bevel", "BEVEL"); md.width = bevel; md.segments = 5
    o.data.materials.append(M[m]); return o
def text(s, m, size=1.5, loc=(0, 0, 0), extrude=0.16):
    bpy.ops.object.text_add(location=loc, rotation=(R(90), 0, 0)); o = bpy.context.object
    o.data.body = s; o.data.align_x = "CENTER"; o.data.align_y = "CENTER"; o.data.size = size; o.data.extrude = extrude; o.data.bevel_depth = 0.035; o.data.bevel_resolution = 4
    o.data.materials.append(M[m]); return o
def star_pts(n, r1, r2, turn=90):
    return [((r1 if i % 2 == 0 else r2) * math.cos(R(turn) + math.pi * i / n), (r1 if i % 2 == 0 else r2) * math.sin(R(turn) + math.pi * i / n)) for i in range(n * 2)]
F = R(90)   # couché face à la caméra

def i_play(): cyl((0, 0, 0), 1.15, 0.45, "green", (F, 0, 0)); poly([(-0.33, 0.52), (-0.33, -0.52), (0.6, 0)], 0.22, "white", (0, -0.3, 0), 0.06)
def i_path():
    box((0, 0.1, -0.05), (2.1, 0.16, 1.6), 0.07, "yellow", (R(-12), 0, 0))
    for i, (x, z) in enumerate([(-0.75, -0.45), (-0.35, -0.2), (0.0, -0.35), (0.3, -0.05)]): sph((x, -0.08, z), 0.08, "dark")
    sph((0.62, -0.25, 0.62), 0.34, "red"); cyl((0.62, -0.25, 0.22), 0.0, 0.55, "red", verts=32, r2=0.26, bevel=False); sph((0.62, -0.55, 0.66), 0.12, "white")
def i_target():
    for r, m, y in ((1.15, "white", 0.0), (0.85, "pink", -0.08), (0.55, "white", -0.16), (0.27, "red", -0.24)): cyl((0, y, 0), r, 0.25, m, (F, 0, 0))
    cyl((0.5, -0.75, 0.5), 0.045, 1.3, "grey", (R(60), 0, R(-35))); poly([(0, 0), (0.3, 0.12), (0.3, -0.12)], 0.05, "cyanE", (0.86, -1.22, 0.83), 0.01, (0, R(-40), 0))
def i_medal():
    poly([(-0.55, 1.3), (-0.1, 1.3), (0.2, 0.3), (-0.25, 0.3)], 0.12, "blue", (0, 0.05, 0)); poly([(0.55, 1.3), (0.1, 1.3), (-0.2, 0.3), (0.25, 0.3)], 0.12, "pink", (0, 0.0, 0))
    cyl((0, -0.05, -0.35), 0.85, 0.22, "gold", (F, 0, 0)); poly(star_pts(5, 0.5, 0.21), 0.1, "yellowE", (0, -0.2, -0.35), 0.02)
def i_magnifier():
    torus((-0.2, 0, 0.25), 0.78, 0.13, "grey", (F, 0, 0)); cyl((-0.2, 0, 0.25), 0.74, 0.08, "sky", (F, 0, 0)); sph((-0.45, -0.12, 0.5), (0.2, 0.03, 0.12), "white", (0, R(35), 0))
    cyl((0.72, 0, -0.72), 0.14, 0.95, "orange", (0, R(-45), 0))
def gear(loc, r, n, m, hole="dark"):
    cyl(loc, r * 0.8, 0.34, m, (F, 0, 0))
    for i in range(n):
        a = 2 * math.pi * i / n; box((loc[0] + r * 0.88 * math.cos(a), loc[1], loc[2] + r * 0.88 * math.sin(a)), (r * 0.36, 0.32, r * 0.3), 0.04, m, (0, -a, 0))
    cyl((loc[0], loc[1] - 0.05, loc[2]), r * 0.3, 0.36, hole, (F, 0, 0))
def i_gear(): gear((-0.3, 0, -0.2), 0.95, 8, "orange"); gear((0.75, 0.05, 0.75), 0.52, 6, "green")
def i_rocket():
    sph((0, 0, 0.1), (0.5, 0.5, 1.0), "white"); cyl((0, 0, 1.0), 0.36, 0.55, "red", verts=48, r2=0.0, bevel=False); sph((0, -0.44, 0.3), 0.2, "cyanE"); torus((0, -0.42, 0.3), 0.22, 0.05, "grey", (F, 0, 0))
    for x in (-0.55, 0.55): poly([(0, 0.35), (0.38 if x > 0 else -0.38, -0.35), (0, -0.2)], 0.1, "red", (x * 0.82, 0, -0.55), 0.03)
    cyl((0, 0, -0.78), 0.3, 0.2, "grey"); cyl((0, 0, -1.12), 0.24, 0.5, "orangeE", verts=32, r2=0.0, rot=(R(180), 0, 0), bevel=False)
def i_blocks(): box((-0.5, 0, -0.55), (0.92,) * 3, 0.14, "blue"); box((0.5, 0, -0.55), (0.92,) * 3, 0.14, "red"); box((0, 0, 0.42), (0.92,) * 3, 0.14, "yellow"); [cyl((x, 0, z), 0.2, 0.14, m) for x, z, m in ((-0.5, -0.05, "blue"), (0.5, -0.05, "red"), (0, 0.92, "yellow"))]
def i_code():
    box((0, 0.1, 0), (2.3, 0.3, 1.7), 0.2, "grey"); box((0, -0.04, 0), (2.05, 0.1, 1.45), 0.12, "dark")
    for sx in (-1, 1):
        box((sx * 0.62, -0.14, 0.17), (0.5, 0.08, 0.1), 0.03, "cyanE", (0, R(sx * 35), 0)); box((sx * 0.62, -0.14, -0.17), (0.5, 0.08, 0.1), 0.03, "cyanE", (0, R(-sx * 35), 0))
    box((0, -0.14, 0), (0.1, 0.08, 0.8), 0.03, "pinkE", (0, R(18), 0))
def i_sensor():
    sph((0, 0, 0), (1.15, 0.5, 0.72), "white"); sph((0, -0.36, 0), (0.48, 0.18, 0.48), "blue"); sph((0, -0.5, 0), (0.24, 0.08, 0.24), "cyanE"); sph((-0.12, -0.6, 0.13), 0.06, "white")
    torus((0, 0.1, 0), 1.3, 0.04, "cyanE", (F, 0, 0))
def i_palette():
    cyl((0, 0, 0), 1.2, 0.2, "white", (R(78), 0, 0))
    for i, m in enumerate(("red", "yellow", "green", "blue", "purple")):
        a = R(200 - i * 50); sph((0.78 * math.cos(a), -0.2, 0.78 * math.sin(a) * 0.95), (0.21, 0.12, 0.21), m)
    cyl((0.45, -0.1, -0.45), 0.2, 0.3, "dark", (R(78), 0, 0))
def i_star(): poly(star_pts(5, 1.3, 0.58), 0.45, "yellowE", bevel=0.14)
def i_lock():
    torus((0, 0, 0.35), 0.52, 0.14, "grey", (F, 0, 0)); box((0, 0, -0.4), (1.7, 0.7, 1.3), 0.22, "purple"); cyl((0, -0.37, -0.3), 0.17, 0.1, "cyanE", (F, 0, 0)); box((0, -0.37, -0.58), (0.12, 0.08, 0.36), 0.03, "cyanE")
def i_trophy():
    cyl((0, 0, 0.45), 0.42, 1.1, "gold", verts=48, r2=0.85); [torus((x, 0, 0.55), 0.3, 0.07, "gold", (F, 0, 0)) for x in (-0.82, 0.82)]
    cyl((0, 0, -0.3), 0.13, 0.5, "gold"); cyl((0, 0, -0.68), 0.6, 0.18, "gold"); box((0, 0, -0.92), (1.5, 0.9, 0.3), 0.08, "dark"); poly(star_pts(5, 0.28, 0.12), 0.06, "white", (0, -0.62, 0.5), 0.01)
def i_bolt(): poly([(0.25, 1.35), (-0.75, -0.1), (-0.05, -0.1), (-0.3, -1.35), (0.8, 0.25), (0.08, 0.25)], 0.4, "yellowE", bevel=0.09)
def i_puzzle(): box((0, 0, -0.1), (1.6, 0.42, 1.6), 0.12, "green"); cyl((0, 0, 0.82), 0.3, 0.42, "green", (F, 0, 0)); cyl((0.92, 0, -0.1), 0.3, 0.42, "green", (F, 0, 0)); cyl((-0.62, -0.03, -0.1), 0.28, 0.46, "dark", (F, 0, 0))
def i_dice():
    box((0, 0, 0), (1.7, 1.7, 1.7), 0.3, "white", (0, 0, R(28)))
    c, s = math.cos(R(28)), math.sin(R(28))
    for u, v in ((-0.42, 0.42), (0, 0), (0.42, -0.42)): sph((u * c + 0.86 * s, u * s - 0.86 * c, v), (0.13, 0.13, 0.13), "red")
    for u, v in ((-0.4, 0.4), (0.4, -0.4)): sph((-0.86 * c + u * -s, -0.86 * s - u * c * -1, v), 0.13, "blue")
    sph((0, 0, 0.86), (0.16, 0.16, 0.08), "pink")
# tuiles des 3-6 ans
def i_school():
    box((0, 0, -0.45), (1.7, 1.2, 1.2), 0.1, "white"); cyl((0, 0, 0.6), 1.45, 0.9, "red", verts=4, r2=0.0, rot=(0, 0, R(45)), bevel=False)
    box((0, -0.6, -0.68), (0.45, 0.1, 0.72), 0.05, "blue"); [box((x, -0.6, -0.3), (0.34, 0.08, 0.34), 0.04, "cyanE") for x in (-0.55, 0.55)]
def i_numbers(): text("1", "red", 1.6, (-0.78, 0, 0.1), 0.22); text("2", "yellow", 1.5, (0.0, 0.1, -0.1)); text("3", "blue", 1.5, (0.72, 0, 0.1))
def i_letters(): text("a", "green", 1.6, (-0.75, 0, 0.0)); text("b", "pink", 1.6, (0.02, 0.1, 0.05)); text("c", "purple", 1.6, (0.75, 0, 0.0))
def i_colors(): sph((-0.55, 0, -0.4), 0.62, "red"); sph((0.55, 0, -0.4), 0.62, "blue"); sph((0, 0.05, 0.5), 0.62, "yellow")
def i_parts():
    gear((0.35, 0.1, 0.3), 0.8, 8, "grey"); cyl((-0.55, -0.2, -0.55), 0.55, 0.36, "orange", (F, 0, 0), verts=6); cyl((-0.55, -0.25, -0.55), 0.26, 0.4, "dark", (F, 0, 0))
def calendar(band, dot):
    box((0, 0, -0.1), (1.9, 0.3, 1.8), 0.16, "white"); box((0, -0.03, 0.62), (1.9, 0.3, 0.5), 0.14, band); [cyl((x, -0.05, 0.95), 0.07, 0.4, "grey") for x in (-0.5, 0.5)]
    for r in range(3):
        for c in range(4): sph((-0.6 + c * 0.4, -0.17, 0.12 - r * 0.38), (0.11, 0.05, 0.11), dot if (r, c) == (1, 2) else "dark")
def i_days(): calendar("red", "cyanE")
def i_months(): calendar("blue", "pinkE")
def i_link(): torus((-0.45, 0, 0), 0.62, 0.17, "pink", (F, 0, 0)); torus((0.45, 0, 0), 0.62, 0.17, "blue", (R(20), 0, 0))
def i_space():
    sph((0, 0, 0), 0.82, "purple"); torus((0, 0, 0), 1.25, 0.07, "yellowE", (R(20), R(16), 0)); sph((0.95, -0.5, 0.75), 0.2, "white"); sph((-0.3, -0.7, 0.25), (0.22, 0.1, 0.16), "pink")

# menu des parents
def i_players():
    for x, m, z in ((-0.55, "blue", 0.0), (0.55, "pink", -0.12)):
        sph((x, 0, 0.55 + z), 0.42, m); sph((x, 0, -0.45 + z), (0.6, 0.42, 0.62), m); sph((x - 0.14, -0.38, 0.6 + z), 0.07, "cyanE"); sph((x + 0.14, -0.38, 0.6 + z), 0.07, "cyanE")
def i_sound():
    box((-0.7, 0, 0), (0.55, 0.6, 0.7), 0.1, "grey"); cyl((-0.15, 0, 0), 0.38, 0.75, "blue", (0, R(90), 0), verts=48, r2=0.85, bevel=False)
    for r, x in ((0.55, 0.55), (0.85, 0.75)): torus((x - 0.35, 0, 0), r, 0.06, "cyanE", (0, R(90), 0))
def i_screen():
    box((0, 0, 0.15), (2.2, 0.22, 1.5), 0.14, "grey"); box((0, -0.1, 0.15), (1.95, 0.1, 1.25), 0.08, "dark"); box((0, 0.1, -0.75), (0.3, 0.2, 0.4), 0.05, "grey"); box((0, 0.1, -0.98), (1.1, 0.5, 0.12), 0.05, "grey")
    for i, m in enumerate(("pinkE", "cyanE", "yellowE", "greenE")): sph((-0.6 + i * 0.4, -0.18, 0.15 + (0.18 if i % 2 else -0.18)), (0.17, 0.05, 0.17), m)
def i_cards():
    box((-0.35, 0.15, -0.05), (1.15, 0.1, 1.6), 0.08, "blue", (0, R(14), 0)); box((0.05, 0.05, 0.0), (1.15, 0.1, 1.6), 0.08, "white", (0, R(2), 0)); box((0.45, -0.08, -0.05), (1.15, 0.1, 1.6), 0.08, "pink", (0, R(-12), 0))
    poly(star_pts(5, 0.3, 0.13), 0.06, "yellowE", (0.47, -0.2, -0.02), 0.01, (0, R(-12), 0))
def i_timer():
    cyl((0, 0, -0.1), 1.0, 0.36, "white", (F, 0, 0)); torus((0, 0, -0.1), 1.0, 0.11, "orange", (F, 0, 0)); cyl((0, 0, 1.05), 0.18, 0.3, "grey"); box((0.72, 0, 0.78), (0.3, 0.22, 0.16), 0.04, "grey", (0, R(-45), 0))
    box((0, -0.22, 0.2), (0.09, 0.08, 0.62), 0.03, "dark"); box((0.2, -0.22, -0.02), (0.5, 0.08, 0.09), 0.03, "pinkE", (0, R(-25), 0)); sph((0, -0.24, -0.1), (0.1, 0.05, 0.1), "dark")
def i_stats():
    box((0, 0.05, -1.0), (2.1, 0.5, 0.16), 0.05, "grey")
    for x, h, m in ((-0.7, 0.7, "cyanE"), (0.0, 1.25, "pinkE"), (0.7, 1.8, "yellowE")): box((x, 0, -0.9 + h / 2), (0.5, 0.42, h), 0.08, m)
def i_shield():
    poly([(0, 1.25), (0.95, 0.9), (0.9, -0.1), (0.5, -0.8), (0, -1.2), (-0.5, -0.8), (-0.9, -0.1), (-0.95, 0.9)], 0.42, "blue", bevel=0.12)
    poly([(-0.42, 0.05), (-0.12, -0.3), (0.5, 0.42), (0.36, 0.56), (-0.12, 0.0), (-0.28, 0.18)], 0.1, "greenE", (0, -0.28, 0.05), 0.02)

ICONS = dict(players=i_players, sound=i_sound, screen=i_screen, cards=i_cards, timer=i_timer, stats=i_stats, shield=i_shield, play=i_play, path=i_path, target=i_target, medal=i_medal, magnifier=i_magnifier, gear=i_gear, rocket=i_rocket, blocks=i_blocks, code=i_code, sensor=i_sensor,
             palette=i_palette, star=i_star, lock=i_lock, trophy=i_trophy, bolt=i_bolt, puzzle=i_puzzle, dice=i_dice,
             school=i_school, numbers=i_numbers, letters=i_letters, colors=i_colors, parts=i_parts, days=i_days, months=i_months, link=i_link, space=i_space)

def aim(o, target): o.rotation_euler = (Vector(target) - o.location).to_track_quat("-Z", "Y").to_euler()
def light(name, loc, energy, size, color):
    d = bpy.data.lights.new(name, "AREA"); d.energy = energy; d.size = size; d.color = color
    o = bpy.data.objects.new(name, d); o.location = loc; scene.collection.objects.link(o); aim(o, (0, 0, 0)); return o
KEEP = [light("cle", (-4, -6, 6), 1500, 6, (1, 0.97, 0.92)), light("contre", (5, 5, 4), 2200, 4, (0.45, 0.65, 1)), light("appoint", (5, -5, 0.5), 420, 5, (1, 0.55, 0.9)), light("dessous", (0, -2, -3.5), 220, 4, (0.3, 0.9, 1))]
w = bpy.data.worlds.new("monde"); scene.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.03, 0.05, 0.14, 1); bg.inputs[1].default_value = 1.0
cd = bpy.data.cameras.new("cam"); cd.lens = 98; cam = bpy.data.objects.new("cam", cd); cam.location = (2.2, -9.2, 2.3); scene.collection.objects.link(cam); aim(cam, (0, 0, -0.18)); scene.camera = cam; KEEP.append(cam)
scene.render.engine = "CYCLES"; scene.cycles.samples = 64; scene.cycles.use_denoising = True
try:
    pr = bpy.context.preferences.addons["cycles"].preferences; pr.compute_device_type = "OPTIX"; pr.get_devices()
    for d in pr.devices: d.use = True
    scene.cycles.device = "GPU"
except Exception as e: print("CPU", e)
scene.render.film_transparent = True; scene.render.resolution_x = scene.render.resolution_y = SIZE
scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "RGBA"
try: scene.view_settings.view_transform = "Standard"; scene.view_settings.look = "None"
except Exception as e: print(e)

for name, fn in ICONS.items():
    if ONLY and name not in ONLY: continue
    for o in list(scene.objects):
        if o not in KEEP: bpy.data.objects.remove(o, do_unlink=True)
    try:
        fn(); torus((0, 0, -1.42), 0.95, 0.045, "cyanE")   # l'anneau lumineux commun à toutes les icônes
        scene.render.filepath = os.path.join(OUT, f"ico-{name}.png"); bpy.ops.render.render(write_still=True); print("RENDU", name)
    except Exception as e:
        import traceback; traceback.print_exc(); print("ECHEC", name, e)
