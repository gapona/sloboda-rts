#!/usr/bin/env python3
"""
Собирает из 4-кадровых листов Слободы (stand/windup/strike/hit, один ракурс)
спрайтшиты формата движка: 192x192, ряды = направления S/E/N/W.

idle  (4 к/напр): кадр stand с лёгким дыханием (вертикальный боб)
walk  (8 к/напр): stand с шагающим бобом и наклоном
attack(6 к/напр): 0,1,1,2,2,3
death (8 к/напр): кадр hit, прогрессивный поворот «падение» + затухание
work  (6 к/напр): 1,1,2,2,0,0 (замах-удар-возврат) — только worker
"""
import sys
from PIL import Image

FRAME = 192
SRC_FRAMES = 4
FACINGS = ['south', 'east', 'north', 'west']

ANIMS = {
    'idle':   {'frames': 4},
    'walk':   {'frames': 8},
    'attack': {'frames': 6},
    'death':  {'frames': 8},
    'work':   {'frames': 6},
}


def load_frames(path: str) -> list[Image.Image]:
    sheet = Image.open(path).convert('RGBA')
    fw = sheet.width // SRC_FRAMES
    frames = []
    for i in range(SRC_FRAMES):
        fr = sheet.crop((i * fw, 0, (i + 1) * fw, sheet.height))
        bbox = fr.getbbox()
        if bbox:
            fr = fr.crop(bbox)
        # вписываем в 176px по высоте, низ кадра = «земля»
        scale = 168 / fr.height
        fr = fr.resize((max(1, round(fr.width * scale)), 168), Image.LANCZOS)
        frames.append(fr)
    return frames


def place(canvas: Image.Image, fr: Image.Image, cx: int, dy: int = 0, rot: float = 0, alpha: float = 1.0) -> None:
    f = fr
    if rot:
        f = f.rotate(rot, expand=True, resample=Image.BICUBIC)
    if alpha < 1.0:
        a = f.getchannel('A').point(lambda v: int(v * alpha))
        f = f.copy()
        f.putalpha(a)
    x = cx - f.width // 2
    y = FRAME - 12 - f.height + dy
    canvas.alpha_composite(f, (x, y))


def build_anim(frames: list[Image.Image], anim: str) -> Image.Image:
    n = ANIMS[anim]['frames']
    sheet = Image.new('RGBA', (FRAME * n, FRAME * 4), (0, 0, 0, 0))
    for row, facing in enumerate(FACINGS):
        src = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in frames] if facing == 'west' else frames
        for col in range(n):
            cell = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
            if anim == 'idle':
                place(cell, src[0], FRAME // 2, dy=[0, -1, -2, -1][col])
            elif anim == 'walk':
                bob = [0, -2, -3, -2, 0, -2, -3, -2][col]
                tilt = [0, 2, 0, -2, 0, 2, 0, -2][col]
                place(cell, src[0], FRAME // 2, dy=bob, rot=tilt)
            elif anim == 'attack':
                place(cell, src[[0, 1, 1, 2, 2, 3][col]], FRAME // 2)
            elif anim == 'death':
                rot = [-10, -25, -42, -58, -72, -82, -88, -88][col]
                if facing == 'west':
                    rot = -rot
                alpha = 1.0 if col < 6 else (0.7 if col == 6 else 0.45)
                place(cell, src[3], FRAME // 2, dy=[0, 4, 10, 18, 26, 32, 34, 34][col], rot=rot, alpha=alpha)
            elif anim == 'work':
                place(cell, src[[1, 1, 2, 2, 0, 0][col]], FRAME // 2)
            sheet.alpha_composite(cell, (col * FRAME, row * FRAME))
    return sheet


def main() -> None:
    src, outdir, name = sys.argv[1], sys.argv[2], sys.argv[3]
    with_work = len(sys.argv) > 4 and sys.argv[4] == '--work'
    frames = load_frames(src)
    for anim in ANIMS:
        if anim == 'work' and not with_work:
            continue
        sheet = build_anim(frames, anim)
        out = f'{outdir}/{name}_{anim}.png'
        sheet.save(out, optimize=True)
        print(out, sheet.size)


if __name__ == '__main__':
    main()
