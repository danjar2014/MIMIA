# Robot Bolt en 3D, modélisé par script.  blender -b -P bolt.py -- <dossier de sortie> [taille]
import bpy, math, sys, os
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
OUT = args[0]; SIZE = int(args[1]) if len(args) > 1 else 900
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

BLUE = mat("bleu", (0.02, 0.16, 0.90))
WHITE = mat("blanc", (0.86, 0.89, 0.96), rough=0.3)
GREY = mat("gris", (0.25, 0.28, 0.36), rough=0.35, metal=0.8)
DARK = mat("visiere", (0.004, 0.006, 0.02), rough=0.32, coat=0.25)
CYAN = mat("cyan", (0.0, 0.5, 0.6), emit=(0.05, 0.85, 1.0), strength=4.5, coat=0)
ORANGE = mat("orange", (1.0, 0.25, 0.03), emit=(1.0, 0.22, 0.02), strength=0.9)
PINK = mat("rose", (0.9, 0.1, 0.6), emit=(1.0, 0.08, 0.55), strength=1.6, coat=0)

def finish(o, m, sub=0):
    for p in o.data.polygons: p.use_smooth = True
    if sub:
        md = o.modifiers.new("sub", "SUBSURF"); md.levels = sub; md.render_levels = sub
    o.data.materials.append(m); return o

def rbox(name, loc, size, bevel, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.name = name
    o.scale = size; bpy.ops.object.transform_apply(scale=True)
    md = o.modifiers.new("bevel", "BEVEL"); md.width = bevel; md.segments = 12
    return finish(o, m, 1)

def sph(name, loc, scale, m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1, location=loc); o = bpy.context.object; o.name = name
    o.scale = scale if isinstance(scale, tuple) else (scale,) * 3
    return finish(o, m)

def cyl(name, loc, r, depth, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=r, depth=depth, location=loc, rotation=rot); o = bpy.context.object; o.name = name
    md = o.modifiers.new("bevel", "BEVEL"); md.width = min(r, depth) * 0.25; md.segments = 6; md.limit_method = "ANGLE"
    return finish(o, m)

def torus(name, loc, big, small, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=big, minor_radius=small, major_segments=96, minor_segments=24, location=loc, rotation=rot); o = bpy.context.object; o.name = name
    return finish(o, m)

def empty(name, loc):
    e = bpy.data.objects.new(name, None); e.location = loc; scene.collection.objects.link(e); return e

def adopt(parent, objs):
    bpy.context.view_layer.update()
    for o in objs:
        o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted()

root = empty("racine", (0, 0, 0))
# corps
torso = rbox("torse", (0, 0, 0.98), (1.25, 0.95, 1.05), 0.32, BLUE)
belt = torus("ceinture", (0, 0, 0.56), 0.5, 0.07, WHITE)
chest = cyl("coeur", (0, -0.49, 1.05), 0.2, 0.06, PINK, rot=(R(90), 0, 0))
chest_ring = torus("coeur-anneau", (0, -0.485, 1.05), 0.25, 0.035, WHITE, rot=(R(90), 0, 0))
pod = sph("socle", (0, 0, 0.38), (0.5, 0.42, 0.2), GREY)
ring1 = torus("anneau1", (0, 0, 0.08), 0.78, 0.055, CYAN)
ring2 = torus("anneau2", (0, 0, -0.14), 0.48, 0.04, CYAN)
neck = cyl("cou", (0, 0, 1.56), 0.27, 0.22, GREY)
# tête
head = empty("tete", (0, 0, 1.6))
skull = rbox("crane", (0, 0, 2.22), (1.95, 1.38, 1.32), 0.44, BLUE)
visor = rbox("visiere", (0, -0.62, 2.2), (1.5, 0.26, 0.66), 0.13, DARK)
eyeL = sph("oeilG", (-0.37, -0.752, 2.3), (0.17, 0.05, 0.19), CYAN)
eyeR = sph("oeilD", (0.37, -0.752, 2.3), (0.17, 0.05, 0.19), CYAN)
earL = cyl("oreilleG", (-1.0, 0, 2.22), 0.24, 0.14, WHITE, rot=(0, R(90), 0))
earR = cyl("oreilleD", (1.0, 0, 2.22), 0.24, 0.14, WHITE, rot=(0, R(90), 0))
earLc = cyl("oreilleG-l", (-1.08, 0, 2.22), 0.11, 0.05, CYAN, rot=(0, R(90), 0))
earRc = cyl("oreilleD-l", (1.08, 0, 2.22), 0.11, 0.05, CYAN, rot=(0, R(90), 0))
ant = cyl("antenne", (0, 0, 3.06), 0.04, 0.4, GREY)
ball = sph("antenne-boule", (0, 0, 3.34), 0.16, ORANGE)
def arc(name, cx, cz, w, bend, m, y=-0.758, thick=0.032):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; sp = cu.splines.new("POLY"); n = 15; sp.points.add(n - 1)
    for i in range(n):
        t = i / (n - 1) * 2 - 1; sp.points[i].co = (cx + t * w / 2, y, cz + bend * (t * t - 1), 1)
    cu.bevel_depth = thick; cu.bevel_resolution = 6; cu.use_fill_caps = True
    o = bpy.data.objects.new(name, cu); scene.collection.objects.link(o); cu.materials.append(m); return o
FACE = dict(
    m_flat=arc("b-plat", 0, 2.03, 0.3, 0, CYAN), m_smile=arc("b-sourire", 0, 2.07, 0.42, 0.11, CYAN), m_sad=arc("b-triste", 0, 2.0, 0.36, -0.08, CYAN),
    m_open=sph("b-ouverte", (0, -0.752, 2.03), (0.17, 0.04, 0.11), PINK),
    eL_arc=arc("oG-arc", -0.37, 2.26, 0.3, -0.1, CYAN, thick=0.04), eR_arc=arc("oD-arc", 0.37, 2.26, 0.3, -0.1, CYAN, thick=0.04),
    eL_line=arc("oG-trait", -0.37, 2.3, 0.3, 0, CYAN, thick=0.035), eR_line=arc("oD-trait", 0.37, 2.3, 0.3, 0, CYAN, thick=0.035),
    eL=eyeL, eR=eyeR)
adopt(head, [skull, visor, earL, earR, earLc, earRc, ant, ball] + list(FACE.values()))
# bras (pivot à l'épaule)
arms = {}
for side, x in (("G", -0.8), ("D", 0.8)):
    piv = empty("epaule" + side, (x, 0, 1.28))
    parts = [sph("ep" + side, (x, 0, 1.28), 0.21, WHITE), cyl("bras" + side, (x, 0, 0.93), 0.13, 0.62, BLUE), sph("main" + side, (x, 0, 0.52), 0.21, WHITE)]
    adopt(piv, parts); arms[side] = piv
adopt(root, [torso, belt, chest, chest_ring, pod, ring1, ring2, neck, head, arms["G"], arms["D"]])

# lumières, caméra, rendu
def aim(o, target): o.rotation_euler = (Vector(target) - o.location).to_track_quat("-Z", "Y").to_euler()
def light(name, loc, energy, size, color):
    d = bpy.data.lights.new(name, "AREA"); d.energy = energy; d.size = size; d.color = color
    o = bpy.data.objects.new(name, d); o.location = loc; scene.collection.objects.link(o); aim(o, (0, 0, 1.5)); return o
light("cle", (-4.5, -6, 7), 1900, 6, (1, 0.97, 0.92))
light("contre", (5, 5.5, 5), 2600, 4, (0.45, 0.65, 1))
light("appoint", (5.5, -5, 1.5), 500, 5, (1, 0.55, 0.9))
light("dessous", (0, -2, -2.5), 250, 4, (0.3, 0.9, 1))
w = bpy.data.worlds.new("monde"); scene.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.03, 0.05, 0.14, 1); bg.inputs[1].default_value = 1.0
cd = bpy.data.cameras.new("cam"); cd.lens = 62; cam = bpy.data.objects.new("cam", cd); cam.location = (0, -8.6, 2.2); scene.collection.objects.link(cam); aim(cam, (0, 0, 1.6)); scene.camera = cam

scene.render.engine = "CYCLES"; scene.cycles.samples = 64; scene.cycles.use_denoising = True
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try:
            pr.compute_device_type = kind; pr.get_devices()
            if any(d.type == kind for d in pr.devices):
                for d in pr.devices: d.use = True
                scene.cycles.device = "GPU"; print("GPU", kind); break
        except Exception as e: print("pas de", kind, e)
except Exception as e: print("CPU", e)
scene.render.film_transparent = True; scene.render.resolution_x = scene.render.resolution_y = SIZE
scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "RGBA"
try: scene.view_settings.view_transform = "Standard"; scene.view_settings.look = "None"
except Exception as e: print(e)

# humeurs de l'appli (neutral, happy, worried, thinking, celebrate) + sommeil : racine Z, tête (X, Y, Z), bras G (X, Y), bras D (X, Y), visage
POSES = {
    "neutral":   dict(root=-14, head=(0, 0, 0),    G=(0, 14),     D=(0, -14),  face=("eL", "eR", "m_flat")),
    "happy":     dict(root=18,  head=(0, -7, 6),   G=(0, 138),    D=(0, -12),  face=("eL_arc", "eR_arc", "m_smile")),
    "worried":   dict(root=-10, head=(10, 5, 0),   G=(-35, 38),   D=(-35, -38), face=("eL", "eR", "m_sad")),
    "thinking":  dict(root=20,  head=(3, -8, 8),   G=(-100, -42), D=(0, -10),  face=("eL", "eR_line", "m_flat")),
    "celebrate": dict(root=0,   head=(-8, 0, 0),   G=(0, 132),    D=(0, -132), face=("eL_arc", "eR_arc", "m_open")),
    "sleep":     dict(root=-8,  head=(12, 10, 0),  G=(0, 8),      D=(0, -8),   face=("eL_line", "eR_line", "m_flat")),
}
POSES["front"] = dict(root=0, head=(0, 0, 0), G=(0, 16), D=(0, -16), face=("eL", "eR", "m_smile"))
del POSES["sleep"]
COLORS = ["#3f7fd6", "#e24b4b", "#4caf6a", "#f4c430", "#8e5bc0", "#f28c28", "#2a2a2e", "#14b8a6"]
def lin(h):
    out = []
    for k in (1, 3, 5):
        c = int(h[k:k + 2], 16) / 255; out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return out
bsdf = BLUE.node_tree.nodes["Principled BSDF"]
for ci, hx in enumerate(COLORS):
    r, g, bl = lin(hx); m = max(r, g, bl, 1e-3); k = 0.82 / m if m > 0.2 else 1.6   # couleurs franches ; le noir reste sombre
    bsdf.inputs["Base Color"].default_value = (min(1, r * k), min(1, g * k), min(1, bl * k), 1)
    for name, p in POSES.items():
        root.rotation_euler = (0, 0, R(p["root"]))
        head.rotation_euler = tuple(R(a) for a in p["head"])
        arms["G"].rotation_euler = (R(p["G"][0]), R(p["G"][1]), 0)
        arms["D"].rotation_euler = (R(p["D"][0]), R(p["D"][1]), 0)
        for kf, o in FACE.items(): o.hide_render = kf not in p["face"]
        scene.render.filepath = os.path.join(OUT, f"bolt-c{ci}-{name}.png")
        bpy.ops.render.render(write_still=True)
    print("RENDU couleur", ci)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "bolt.blend"))
