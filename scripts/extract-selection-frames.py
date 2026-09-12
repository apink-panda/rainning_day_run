#!/usr/bin/env python3
"""Extract the 5x6 character showcase frames from the supplied transparent sheet."""

from pathlib import Path
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


PANDA_IDS = ("enji", "chorong", "najoo", "bomi", "hayoung")
FRAME_SIZE = (220, 280)
ALPHA_THRESHOLD = 12


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: extract-selection-frames.py SOURCE.png OUTPUT_DIR")

    source_path = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    source = Image.open(source_path).convert("RGBA")
    pixels = np.asarray(source)
    alpha = pixels[:, :, 3]

    labels, _ = ndimage.label(alpha > ALPHA_THRESHOLD, structure=np.ones((3, 3)))
    objects = ndimage.find_objects(labels)
    components: list[tuple[int, int, int, int, int, int]] = []
    for label_id, slices in enumerate(objects, start=1):
        if slices is None:
            continue
        ys, xs = slices
        area = int(np.count_nonzero(labels[ys, xs] == label_id))
        if area < 20_000:
            continue
        components.append((label_id, xs.start, ys.start, xs.stop, ys.stop, area))

    if len(components) != 30:
        raise RuntimeError(f"expected 30 panda components, found {len(components)}")

    components.sort(key=lambda item: (item[2], item[1]))
    rows = [sorted(components[index:index + 6], key=lambda item: item[1]) for index in range(0, 30, 6)]

    output_dir.mkdir(parents=True, exist_ok=True)
    for panda_id, row in zip(PANDA_IDS, rows):
        panda_dir = output_dir / panda_id
        panda_dir.mkdir(parents=True, exist_ok=True)
        row_top = min(item[2] for item in row)
        row_bottom = max(item[4] for item in row)
        available_motion = FRAME_SIZE[1] - (row_bottom - row_top)
        top_padding = max(4, available_motion // 2)

        for frame_number, (label_id, x0, y0, x1, y1, _) in enumerate(row, start=1):
            component = labels == label_id
            component = ndimage.binary_dilation(component, iterations=2)
            isolated = pixels.copy()
            isolated[:, :, 3] = np.where(component, alpha, 0)
            frame = Image.fromarray(isolated).crop((x0 - 2, y0 - 2, x1 + 2, y1 + 2))

            canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
            x = (FRAME_SIZE[0] - frame.width) // 2
            y = top_padding + (y0 - row_top) - 2
            canvas.alpha_composite(frame, (x, y))
            canvas.save(panda_dir / f"frame-{frame_number}.png", optimize=True)

    print(f"extracted 30 frames to {output_dir}")


if __name__ == "__main__":
    main()
