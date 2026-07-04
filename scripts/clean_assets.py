#!/usr/bin/env python3
"""
СЛОБОДА asset pipeline: удаление запечённого фона (серая «шахматка» из AI-генерации).

Алгоритм:
1. Сэмплируем цвета по периметру изображения, кластеризуем (это оттенки фона).
2. Строим маску «похож на фон»: расстояние в RGB до ближайшего кластера < tol.
3. Flood-fill от границ ТОЛЬКО по этой маске (итеративная дилатация) —
   серые детали внутри объекта (мушкет, камни) не задеваются, если не
   соединены с краем коридором фонового цвета.
4. Эрозия альфы на 1px + лёгкий feather — убираем серый ореол по контуру.

Usage: clean_assets.py <in.png> <out.png> [--tol N] [--resize W] [--frames N]
  --frames N : обработать спрайтшит как N горизонтальных кадров (flood от границ каждого кадра)
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage


def border_clusters(rgb: np.ndarray, max_k: int = 4) -> np.ndarray:
    """Цвета периметра -> до max_k кластеров (простая жадная кластеризация)."""
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0, :], rgb[-1, :], rgb[:, 0], rgb[:, -1]]).astype(np.float32)
    centers: list[np.ndarray] = []
    for px in border:
        for c in centers:
            if np.linalg.norm(px - c) < 24:
                break
        else:
            if len(centers) < max_k:
                centers.append(px.copy())
    # уточняем центры средним по принадлежности
    centers_arr = np.array(centers)
    d = np.linalg.norm(border[:, None, :] - centers_arr[None, :, :], axis=2)
    lab = d.argmin(axis=1)
    refined = [border[lab == i].mean(axis=0) for i in range(len(centers)) if (lab == i).any()]
    return np.array(refined, dtype=np.float32)


def bg_mask_for(rgb: np.ndarray, centers: np.ndarray, tol: float) -> np.ndarray:
    f = rgb.astype(np.float32)
    d = np.full(rgb.shape[:2], 1e9, dtype=np.float32)
    for c in centers:
        d = np.minimum(d, np.linalg.norm(f - c[None, None, :], axis=2))
    return d < tol


def flood_from_border(candidate: np.ndarray) -> np.ndarray:
    """Связные компоненты candidate, касающиеся границы."""
    lbl, n = ndimage.label(candidate, structure=np.ones((3, 3), dtype=np.int8))
    if n == 0:
        return np.zeros_like(candidate)
    edge_labels = np.unique(np.concatenate([lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]]))
    edge_labels = edge_labels[edge_labels != 0]
    return np.isin(lbl, edge_labels)


def clean(img: Image.Image, tol: float, frames: int, island_frac: float = 0.003) -> Image.Image:
    rgba = np.array(img.convert('RGBA'))
    rgb = rgba[..., :3]
    h, w = rgb.shape[:2]
    bg = np.zeros((h, w), dtype=bool)
    fw = w // frames
    for i in range(frames):
        sl = slice(i * fw, (i + 1) * fw if i < frames - 1 else w)
        sub = rgb[:, sl]
        centers = border_clusters(sub)
        cand = bg_mask_for(sub, centers, tol)
        bg[:, sl] = flood_from_border(cand)
    # закрыть дырочки-крапинки внутри фона (антиалиасинг шахматки)
    bg = ndimage.binary_closing(bg, structure=np.ones((3, 3)))
    fg = ~bg
    # удаляем мелкие отсоединённые островки (искорки-вотермарки генератора):
    # оставляем компоненты площадью >= 0.3% кадра
    lbl, n = ndimage.label(fg, structure=np.ones((3, 3), dtype=np.int8))
    if n > 1:
        sizes = ndimage.sum_labels(np.ones_like(lbl), lbl, index=np.arange(1, n + 1))
        min_area = (h * (w / frames)) * island_frac
        keep = np.flatnonzero(sizes >= min_area) + 1
        fg = np.isin(lbl, keep)
    # эрозия 1px против серого ореола
    fg_er = ndimage.binary_erosion(fg, structure=np.ones((3, 3)))
    # feather: альфа 255 внутри, 110 на однопиксельной кромке
    alpha = np.zeros((h, w), dtype=np.uint8)
    alpha[fg_er] = 255
    rim = fg & ~fg_er
    alpha[rim] = 110
    out = rgba.copy()
    out[..., 3] = alpha
    return Image.fromarray(out, 'RGBA')


def main() -> None:
    args = sys.argv[1:]
    src, dst = args[0], args[1]
    tol = 30.0
    resize = None
    frames = 1
    island = 0.003
    i = 2
    while i < len(args):
        if args[i] == '--tol':
            tol = float(args[i + 1]); i += 2
        elif args[i] == '--resize':
            resize = int(args[i + 1]); i += 2
        elif args[i] == '--frames':
            frames = int(args[i + 1]); i += 2
        elif args[i] == '--island':
            island = float(args[i + 1]); i += 2
        else:
            i += 1
    img = Image.open(src)
    out = clean(img, tol, frames, island)
    if resize:
        ratio = resize / out.width
        out = out.resize((resize, max(1, round(out.height * ratio))), Image.LANCZOS)
    out.save(dst, optimize=True)
    cov = (np.array(out)[..., 3] > 0).mean()
    print(f'{src} -> {dst}  fg={cov:.0%}')


if __name__ == '__main__':
    main()
