#!/usr/bin/env python3
"""Build the layered player wizard for the Fight idle animation.

The wizard is painted into dist/assets/fight-arena-background.jpg. This
script cuts the wizard out with a BiRefNet matte and fills the scenery behind.
It then splits the wizard into a body layer and two arm layers. Each arm turns
around its shoulder, where a feathered edge hides the seam. At rest the layers
reproduce the background image exactly. The dummy already has separate body
and wand images, so it needs no layers from this script.

    python3 scripts/generate-fight-idle-art.py --model /path/to/birefnet.onnx

The model makes only the player matte. The script saves the matte in
.tmp/fight-idle/player-matte.png and uses it again when --model is not given.
Python 3 with NumPy, Pillow, OpenCV, and ONNX Runtime is required.
"""

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'dist' / 'assets'
MATTE = ROOT / '.tmp' / 'fight-idle' / 'player-matte.png'
# Player crop of the background in scene pixels: left, top, right, bottom.
# The layer images use this crop as their canvas.
PLAYER_BOX = (0, 240, 660, 810)

# Part geometry uses canvas pixels. An arm turns around `pivot`. Its weight
# rises along the line to `toward`, from 0 at `feather[0]` to 1 at
# `feather[1]` pixels. The body layer drops the part from `cut[0]` to `cut[1]`.
# Polygon edges stay in transparent space, except near the pivot and along a
# `seam`, where the arm touches the body.
PLAYER_PARTS = {
    'wand-arm': {'pivot': (318, 140), 'toward': (565, 132), 'feather': (0, 34), 'cut': (34, 40),
                 'polygon': [(312, 98), (600, 98), (600, 174), (460, 170), (345, 190), (312, 190)]},
    'back-arm': {'pivot': (206, 128), 'toward': (112, 275), 'feather': (6, 42), 'cut': (42, 48),
                 'polygon': [(140, 110), (212, 110), (208, 150), (206, 186), (200, 205), (196, 214), (190, 222),
                             (180, 228), (165, 238), (150, 262), (145, 278), (130, 292), (118, 301), (86, 302),
                             (86, 250), (120, 186), (140, 150)],
                 'seam': [(208, 150), (206, 186)]},
}


def player_matte(model):
    """Return the player alpha (0 to 1) for the crop. Run BiRefNet if a model is given."""
    if model is None:
        return np.asarray(Image.open(MATTE), dtype=np.float32) / 255
    import onnxruntime as ort
    crop = Image.open(ASSETS / 'fight-arena-background.jpg').convert('RGB').crop(PLAYER_BOX)
    options = ort.SessionOptions()
    # The default memory arena needs more than 7 GB for this model.
    options.enable_cpu_mem_arena = False
    options.enable_mem_pattern = False
    session = ort.InferenceSession(str(model), options, providers=['CPUExecutionProvider'])
    pixels = np.asarray(crop.resize((1024, 1024), Image.BICUBIC), dtype=np.float32) / 255
    pixels = (pixels - (0.485, 0.456, 0.406)) / (0.229, 0.224, 0.225)
    logits = session.run(None, {session.get_inputs()[0].name: pixels.transpose(2, 0, 1)[None].astype(np.float32)})[0][0, 0]
    matte = Image.fromarray((255 / (1 + np.exp(-logits))).astype(np.uint8)).resize(crop.size, Image.BICUBIC)
    MATTE.parent.mkdir(parents=True, exist_ok=True)
    matte.save(MATTE)
    return np.asarray(matte, dtype=np.float32) / 255


def polygon_mask(size, points):
    """Rasterize a polygon with 4x supersampled edges."""
    scale = 4
    image = Image.new('L', (size[0] * scale, size[1] * scale), 0)
    ImageDraw.Draw(image).polygon([(x * scale, y * scale) for x, y in points], fill=255)
    return np.asarray(image.resize(size, Image.BOX), dtype=np.float32) / 255


def ramp(values, start, end):
    return np.clip((values - start) / (end - start), 0, 1)


def split(alpha, parts):
    """Split the cut-out into a body alpha and one alpha per part.

    An arm over the body gives the source alpha again. Under a semi-opaque arm
    pixel, the body alpha must therefore be (alpha - arm) / (1 - arm). Where
    the arm is opaque, the body fades out over the `cut` range. The body keeps
    a hidden copy of the arm root, so no gap opens when the arm turns.
    """
    height, width = alpha.shape
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)
    arms, cut = {}, np.zeros_like(alpha)
    for name, part in parts.items():
        (px, py), (tx, ty) = part['pivot'], part['toward']
        length = np.hypot(tx - px, ty - py)
        along = (xs - px) * (tx - px) / length + (ys - py) * (ty - py) / length
        inside = polygon_mask((width, height), part['polygon'])
        arms[name] = quantize(alpha * inside * ramp(along, *part['feather']))
        reach = inside * ramp(along, *part['cut'])
        if 'seam' in part:
            # The body keeps a band of the arm along the seam, so no gap opens
            # when the arm turns away from the body.
            line = np.ones((height, width), np.uint8)
            cv2.polylines(line, [np.array(part['seam'], np.int32)], False, 0)
            reach *= ramp(cv2.distanceTransform(line, cv2.DIST_L2, 5), 3, 6)
        cut = np.maximum(cut, reach)
    arm = np.sum(list(arms.values()), axis=0)
    body = np.where(arm < 1, (alpha - arm) / np.maximum(1 - arm, 1e-6), 1 - cut)
    return quantize(np.clip(body, 0, 1)), arms


def quantize(alpha, round_up=False):
    return (np.ceil(alpha * 255 - 1e-6) if round_up else np.round(alpha * 255)) / 255


def save(rgb, alpha, name):
    rgba = np.dstack([rgb, np.round(np.clip(alpha, 0, 1) * 255)]).astype(np.uint8)
    # Hidden pixels get a flat color so the PNG stays small.
    rgba[rgba[..., 3] == 0, :3] = 0
    Image.fromarray(rgba, 'RGBA').save(ASSETS / name, optimize=True)


def build_player(model):
    scene = np.asarray(Image.open(ASSETS / 'fight-arena-background.jpg').convert('RGB'))
    left, top, right, bottom = PLAYER_BOX
    alpha = player_matte(model)
    alpha[alpha < 0.03] = 0
    alpha[alpha > 0.97] = 1
    # Fill the scenery behind the player. The fill starts 2 pixels outside the
    # matte, so the faint dark edge around the painted figure stays out of it.
    hole = np.zeros(scene.shape[:2], np.uint8)
    hole[top:bottom, left:right] = cv2.dilate((alpha > 0).astype(np.uint8), np.ones((5, 5), np.uint8))
    plate = cv2.cvtColor(cv2.inpaint(cv2.cvtColor(scene, cv2.COLOR_RGB2BGR), hole * 255, 6, cv2.INPAINT_TELEA),
                         cv2.COLOR_BGR2RGB)
    source = scene[top:bottom, left:right].astype(np.float32)
    backing = plate[top:bottom, left:right].astype(np.float32)
    inside = hole[top:bottom, left:right] > 0
    # Each figure pixel must give the source pixel over the filled plate:
    # alpha * color + (1 - alpha) * plate = source. Where the matte alpha
    # needs a color outside 0 to 255, use the smallest alpha that fits. The
    # dark edge around the figure then moves with it.
    difference = source - backing
    needed = np.where(difference > 0, difference / np.maximum(255 - backing, 1),
                      -difference / np.maximum(backing, 1)).max(axis=2)
    alpha = quantize(np.where(inside, np.clip(np.maximum(alpha, needed), 0, 1), 0), round_up=True)
    color = np.clip(backing + difference / np.maximum(alpha, 1 / 255)[..., None], 0, 255)
    # The plate patch covers the painted player. Outside the filled area it
    # matches the source image, so its feathered border is invisible.
    distance = cv2.distanceTransform((~inside).astype(np.uint8), cv2.DIST_L2, 5)
    save(backing, np.clip(1 - distance / 4, 0, 1), 'fight-player-plate.png')
    body, arms = split(alpha, PLAYER_PARTS)
    save(color, body, 'fight-player-body.png')
    for name, arm in arms.items():
        save(color, arm, f'fight-player-{name}.png')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', type=Path, help='BiRefNet ONNX model for the player matte')
    args = parser.parse_args()
    if args.model is None and not MATTE.exists():
        raise SystemExit(f'Give --model; {MATTE} does not exist yet')
    build_player(args.model)


if __name__ == '__main__':
    main()
