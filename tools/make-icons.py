"""Glossy app icon in the style of early iOS game icons.

Shows a close-up of one 3x3 block in the game's own look: Roboto Bold
(the font Android uses for the game), given digits dark, own entries blue,
the selected cell yellow – plus a gold star.

Usage:  python tools/make-icons.py icons
"""
import sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

OUT = sys.argv[1]
SS = 4  # supersampling
FONT = 'C:/Windows/Fonts/Roboto-Bold_2.ttf'

GIVEN = (29, 37, 51, 255)     # --given
USER = (31, 95, 191, 255)     # --user
SEL = (255, 224, 138, 255)    # --sel
PEER = (230, 237, 247, 255)   # --peer
LINE = (29, 37, 51, 255)      # --line-strong
THIN = (201, 207, 216, 255)   # --line


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def vgrad(w, h, top, bottom):
    g = Image.new('RGBA', (1, h))
    for y in range(h):
        g.putpixel((0, y), lerp(top, bottom, y / max(1, h - 1)))
    return g.resize((w, h))


def radial(w, h, cx, cy, r, inner, outer):
    im = Image.new('RGBA', (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            t = min(1.0, math.hypot(x - cx, y - cy) / r)
            px[x, y] = lerp(inner, outer, t ** 1.4)
    return im


def rounded_mask(size, box, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=radius, fill=255)
    return m


def render(size, full_bleed, safe):
    S = size * SS
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))

    # background: deep blue with soft radial light
    bg = radial(S // 8, S // 8, S // 16, S // 22, S // 8 * 0.95,
                (88, 160, 245, 255), (10, 38, 105, 255)).resize((S, S), Image.BICUBIC)
    corner = 0 if full_bleed else int(S * 0.2237)
    shape = rounded_mask((S, S), [0, 0, S - 1, S - 1], corner)
    canvas.paste(bg, (0, 0), shape)

    # paper tile (one 3x3 block) with drop shadow
    bw = int(S * safe * 0.74)
    bx = (S - bw) // 2
    by = int((S - bw) / 2 + S * 0.01)
    br = int(bw * 0.09)
    shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [bx, by + S * 0.03, bx + bw, by + bw + S * 0.03], radius=br, fill=(0, 10, 40, 170))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(S * 0.03)))

    board = Image.new('RGBA', (bw, bw), (0, 0, 0, 0))
    board.paste(vgrad(bw, bw, (255, 255, 255, 255), (238, 241, 246, 255)), (0, 0),
                rounded_mask((bw, bw), [0, 0, bw - 1, bw - 1], br))
    d = ImageDraw.Draw(board)
    cell = bw / 3

    # selected cell + its row/column like in the game
    sel_r, sel_c = 1, 2
    for k in range(3):
        for (r, c) in [(sel_r, k), (k, sel_c)]:
            d.rectangle([c * cell, r * cell, (c + 1) * cell, (r + 1) * cell], fill=PEER)
    d.rectangle([sel_c * cell, sel_r * cell, (sel_c + 1) * cell, (sel_r + 1) * cell], fill=SEL)
    # re-round the corners that the fills touched
    board.putalpha(ImageChops.multiply(board.getchannel('A'),
                   rounded_mask((bw, bw), [0, 0, bw - 1, bw - 1], br)))
    d = ImageDraw.Draw(board)

    thin = max(2, int(bw * 0.012))
    for k in (1, 2):
        x = round(cell * k)
        d.line([x, 0, x, bw], fill=THIN, width=thin)
        d.line([0, x, bw, x], fill=THIN, width=thin)
    d.rounded_rectangle([0, 0, bw - 1, bw - 1], radius=br, outline=LINE, width=int(bw * 0.035))

    font = ImageFont.truetype(FONT, int(cell * 0.72))
    for r, c, n, col in [(0, 0, '5', GIVEN), (0, 2, '3', GIVEN), (1, 1, '9', GIVEN),
                         (1, 2, '7', USER), (2, 0, '1', USER)]:
        d.text(((c + 0.5) * cell, (r + 0.5) * cell), n, fill=col, font=font, anchor='mm')
    canvas.alpha_composite(board, (bx, by))

    # gold star badge
    sr = bw * 0.24
    scx, scy = bx + bw - sr * 0.45, by + bw - sr * 0.45
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = sr if k % 2 == 0 else sr * 0.45
        pts.append((scx + rr * math.cos(a), scy + rr * math.sin(a)))
    star_sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(star_sh).polygon([(x, y + S * 0.012) for x, y in pts], fill=(60, 30, 0, 150))
    canvas = Image.alpha_composite(canvas, star_sh.filter(ImageFilter.GaussianBlur(S * 0.012)))
    smask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(smask).polygon(pts, fill=255)
    top, bot = scy - sr, scy + sr
    sg = Image.new('RGBA', (1, S))
    for y in range(S):
        t = min(1, max(0, (y - top) / (bot - top)))
        sg.putpixel((0, y), lerp((255, 240, 150, 255), (206, 128, 0, 255), t))
    canvas.paste(sg.resize((S, S)), (0, 0), smask)
    ImageDraw.Draw(canvas).polygon(pts, outline=(150, 90, 0, 255), width=max(2, int(S * 0.006)))

    # classic iOS gloss arc over the top half
    gl = Image.new('L', (S, S), 0)
    ImageDraw.Draw(gl).ellipse([-S * 0.35, -S * 0.62, S * 1.35, S * 0.50], fill=255)
    grad = Image.new('L', (1, S))
    for y in range(S):
        t = y / (S * 0.5)
        grad.putpixel((0, y), int(120 * (1 - t) + 18) if t < 1 else 0)
    gl = ImageChops.multiply(gl, grad.resize((S, S)))
    gloss = Image.composite(Image.new('RGBA', (S, S), (255, 255, 255, 255)),
                            Image.new('RGBA', (S, S), (255, 255, 255, 0)), gl)
    canvas = Image.alpha_composite(canvas, gloss)

    if not full_bleed:
        rim = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(rim).rounded_rectangle([2, 2, S - 3, S - 3], radius=corner,
                                              outline=(255, 255, 255, 70), width=int(S * 0.008))
        canvas = Image.alpha_composite(canvas, rim)

    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(canvas, (0, 0), shape)
    return out.resize((size, size), Image.LANCZOS)


render(192, False, 1.0).save(OUT + '/icon-192.png')
render(512, False, 1.0).save(OUT + '/icon-512.png')
render(512, True, 0.80).save(OUT + '/icon-maskable-512.png')
render(180, True, 1.0).save(OUT + '/apple-touch-icon.png')
