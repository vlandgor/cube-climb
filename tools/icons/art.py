# Cube Climb icon art, as SVG on the 108x108 adaptive-icon canvas.
# Everything that must survive any launcher mask sits inside the r=33 safe circle.
# Colours are the game's own: background #0b0e14..#1a2540, cube #4b8bff, visited tile #5ad1a8.
SHIFT_Y = 0     # move the whole composition up a touch: the cube is the visual weight

def tiles_and_cube(mono=False):
    """Mid-climb: the cube has jumped off a visited tile and is about to land on the next one.
    Faint tiles above and below, mostly outside the mask, say the stairs keep going."""
    g = lambda c: "#fff" if mono else c
    o = lambda v: 1 if mono else v
    out = []
    def tile(cx, top, col, op):
        out.append(f'<rect x="{cx-9}" y="{top}" width="18" height="5" rx="2.3" fill="{g(col)}" opacity="{o(op)}"/>')
    if not mono:
        tile(12, 94, "#5ad1a8", .35)            # below: visited
        tile(96, 22, "#7f8fae", .3)             # above: still to climb
    tile(40, 70, "#5ad1a8", 1)                  # the tile it jumped from
    tile(68, 46, "#7f8fae", .8)                 # the tile it will land on
    if not mono:                                # the game's target preview around it
        out.append('<rect x="57.6" y="44.3" width="20.8" height="8.4" rx="3.6" fill="none" '
                   'stroke="#5ad1a8" stroke-opacity=".6" stroke-width="1.3"/>')
    # the jump arc, from the tile it left to the cube
    out.append(f'<path d="M40 69 Q41 44 52 41" fill="none" stroke="{g("#cfe0ff")}" stroke-opacity="{o(.45)}" '
               'stroke-width="1.6" stroke-linecap="round" stroke-dasharray="0.1 4"/>')
    # the cube, tilted forward in flight
    out.append('<g transform="rotate(12 56 34)">')
    out.append(f'<rect x="47" y="25" width="18" height="18" rx="3.8" fill="{g("#4b8bff")}"/>')
    if not mono:
        out.append('<rect x="49.5" y="27.5" width="13" height="2.5" rx="1.25" fill="#fff" opacity=".8"/>')
    out.append('</g>')
    # centre the composition in the safe circle: a little smaller, a little lower
    return '<g transform="translate(54 57.5) scale(.93) translate(-54 -54)">' + "\n".join(out) + '</g>'

def background():
    lines = "".join(f'<line x1="0" x2="108" y1="{v}" y2="{v}" stroke="#fff" stroke-opacity=".045" stroke-width=".7"/>'
                    for v in (25, 47, 69, 91))
    return f'''<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#1c2846"/><stop offset="1" stop-color="#0b0e14"/></linearGradient></defs>
<rect width="108" height="108" fill="url(#bg)"/>{lines}'''

def svg(body, view="0 0 108 108", size=108, clip=None):
    c = ""
    if clip == "circle":
        c = '<clipPath id="c"><circle cx="54" cy="54" r="36"/></clipPath>'
        body = f'<g clip-path="url(#c)">{body}</g>'
    elif clip == "squircle":
        c = '<clipPath id="c"><rect x="18" y="18" width="72" height="72" rx="15"/></clipPath>'
        body = f'<g clip-path="url(#c)">{body}</g>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" width="{size}" height="{size}">'
            f'<defs>{c}</defs>{body}</svg>')

FG = lambda: svg(tiles_and_cube())
# the splash shows the icon without a mask behind it, so trim the faint edge tiles to the
# same circle Android 12 uses; otherwise they float on their own
SPLASH = lambda: svg('<clipPath id="s"><circle cx="54" cy="54" r="34"/></clipPath>'
                     '<g clip-path="url(#s)">' + tiles_and_cube() + '</g>')
BG = lambda: svg(background())
MONO = lambda: svg(tiles_and_cube(mono=True))
FULL = lambda clip=None, view="18 18 72 72": svg(background() + tiles_and_cube(), view=view, clip=clip)
