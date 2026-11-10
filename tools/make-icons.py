"""Glossy, skeuomorphic Sudoku icon in the style of early iOS game icons."""
import sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

OUT = sys.argv[1]
SS = 4  # supersampling
FONT = 'C:/Windows/Fonts/georgiab.ttf'


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
    """full_bleed: background fills square (maskable). safe: fraction of size the motif may use."""
    S = size * SS
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))

    # ---- background: deep blue with a soft radial light ----
    bg = radial(S // 8, S // 8, S // 16, S // 22, S // 8 * 0.95, (88, 160, 245, 255), (10, 38, 105, 255)).resize((S, S), Image.BICUBIC)
    corner = 0 if full_bleed else int(S * 0.2237)  # iOS-like corner radius
    shape = rounded_mask((S, S), [0, 0, S - 1, S - 1], corner)
    canvas.paste(bg, (0, 0), shape)

    # ---- paper board with drop shadow ----
    bw = int(S * safe * 0.80)
    bx = (S - bw) // 2
    by = int((S - bw) / 2 + S * 0.015)
    br = int(bw * 0.07)
    shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([bx, by + S * 0.025, bx + bw, by + bw + S * 0.025], radius=br, fill=(0, 10, 40, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(S * 0.03))
    canvas = Image.alpha_composite(canvas, shadow)

    paper = vgrad(bw, bw, (255, 253, 244, 255), (233, 222, 192, 255))
    pmask = rounded_mask((bw, bw), [0, 0, bw - 1, bw - 1], br)
    board = Image.new('RGBA', (bw, bw), (0, 0, 0, 0))
    board.paste(paper, (0, 0), pmask)
    d = ImageDraw.Draw(board)
    pad = int(bw * 0.075)
    g = bw - 2 * pad
    thin, thick = max(2, int(g * 0.008)), int(g * 0.026)
    for k in range(0, 10):
        x = pad + round(g * k / 9)
        w, col = (thick, (28, 52, 98, 255)) if k % 3 == 0 else (thin, (185, 192, 205, 255))
        if k % 3:
            d.line([x, pad, x, pad + g], fill=col, width=w)
            d.line([pad, x, pad + g, x], fill=col, width=w)
    for k in range(0, 10, 3):
        x = pad + round(g * k / 9)
        d.line([x, pad - thick // 2, x, pad + g + thick // 2], fill=(28, 52, 98, 255), width=thick)
        d.line([pad - thick // 2, x, pad + g + thick // 2, x], fill=(28, 52, 98, 255), width=thick)

    font = ImageFont.truetype(FONT, int(g / 9 * 0.95))
    ink, blue, red = (30, 36, 52, 255), (34, 92, 190, 255), (196, 40, 40, 255)
    digits = [(0, 0, '5', ink), (0, 4, '3', ink), (1, 7, '8', ink), (2, 2, '1', blue), (3, 5, '6', ink),
              (4, 4, '9', red), (5, 1, '7', ink), (5, 6, '2', blue), (6, 3, '4', ink), (7, 7, '1', ink),
              (8, 1, '3', blue), (8, 5, '8', ink), (2, 6, '4', ink), (6, 8, '6', ink)]
    for r, c, n, col in digits:
        cx = pad + g * (c + 0.5) / 9
        cy = pad + g * (r + 0.53) / 9
        d.text((cx, cy), n, fill=col, font=font, anchor='mm')
    # thin bevel on paper edge
    edge = Image.new('RGBA', (bw, bw), (0, 0, 0, 0))
    ImageDraw.Draw(edge).rounded_rectangle([1, 1, bw - 2, bw - 2], radius=br, outline=(255, 255, 255, 200), width=max(2, int(bw * 0.006)))
    board = Image.alpha_composite(board, edge)
    canvas.alpha_composite(board, (bx, by))

    # ---- gold star badge (bottom right of board) ----
    sr = bw * 0.17
    scx, scy = bx + bw - sr * 0.55, by + bw - sr * 0.55
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
    sgrad = vgrad(S, S, (255, 236, 140, 255), (214, 140, 10, 255))
    # gradient restricted to star's bounding box for richer shading
    top, bot = scy - sr, scy + sr
    sg = Image.new('RGBA', (1, S))
    for y in range(S):
        t = min(1, max(0, (y - top) / (bot - top)))
        sg.putpixel((0, y), lerp((255, 240, 150, 255), (206, 128, 0, 255), t))
    canvas.paste(sg.resize((S, S)), (0, 0), smask)
    ImageDraw.Draw(canvas).polygon(pts, outline=(150, 90, 0, 255), width=max(2, int(S * 0.006)))

    # ---- classic iOS gloss: bright arc over the top half ----
    gloss = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    gl = Image.new('L', (S, S), 0)
    gd = ImageDraw.Draw(gl)
    gd.ellipse([-S * 0.35, -S * 0.62, S * 1.35, S * 0.50], fill=255)
    grad = Image.new('L', (1, S))
    for y in range(S):
        t = y / (S * 0.5)
        grad.putpixel((0, y), int(max(0, 120 * (1 - t) + 18)) if t < 1 else 0)
    gl = ImageChops.multiply(gl, grad.resize((S, S)))
    gloss.putalpha(gl)
    gloss = Image.composite(Image.new('RGBA', (S, S), (255, 255, 255, 255)), Image.new('RGBA', (S, S), (255, 255, 255, 0)), gl)
    canvas = Image.alpha_composite(canvas, gloss)

    # ---- inner rim highlight / shadow (bevel) ----
    if not full_bleed:
        rim = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(rim).rounded_rectangle([2, 2, S - 3, S - 3], radius=corner, outline=(255, 255, 255, 70), width=int(S * 0.008))
        canvas = Image.alpha_composite(canvas, rim)

    # clip everything to the icon shape
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(canvas, (0, 0), shape)
    return out.resize((size, size), Image.LANCZOS)


render(192, False, 1.0).save(OUT + '/icon-192.png')
render(512, False, 1.0).save(OUT + '/icon-512.png')
render(512, True, 0.80).save(OUT + '/icon-maskable-512.png')
render(180, True, 1.0).save(OUT + '/apple-touch-icon.png')
