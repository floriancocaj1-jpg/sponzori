#!/usr/bin/env python3
"""
Simple background remover for uniform backgrounds.
Usage:
  pip install pillow
  python scripts/remove_bg.py pictures/d.png pictures/e.png ...

This script samples the four corners to estimate the background color,
then makes pixels within a given distance from that color transparent.
"""
import sys
from PIL import Image
import math


def sample_bg_color(img):
    w,h = img.size
    corners = [img.getpixel((0,0)), img.getpixel((w-1,0)), img.getpixel((0,h-1)), img.getpixel((w-1,h-1))]
    # ensure RGB tuples
    def to_rgb(c):
        if isinstance(c, int):
            return (c,c,c)
        if len(c) >= 3:
            return (c[0], c[1], c[2])
        return (c[0], c[0], c[0])
    corners = [to_rgb(c) for c in corners]
    # average
    r = sum(c[0] for c in corners)//4
    g = sum(c[1] for c in corners)//4
    b = sum(c[2] for c in corners)//4
    return (r,g,b)


def color_distance(a,b):
    return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)


def remove_background(path, out_path=None, threshold=30):
    im = Image.open(path).convert('RGBA')
    bg = sample_bg_color(im)
    px = im.load()
    w,h = im.size
    for y in range(h):
        for x in range(w):
            r,g,b,a = px[x,y]
            if a == 0:
                continue
            d = color_distance((r,g,b), bg)
            if d <= threshold:
                px[x,y] = (r,g,b,0)
    if out_path is None:
        out_path = path.rsplit('.',1)[0] + '_transparent.png'
    im.save(out_path)
    print('Saved', out_path)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python scripts/remove_bg.py <image1> [image2 ...]')
        sys.exit(1)
    for p in sys.argv[1:]:
        try:
            remove_background(p)
        except Exception as e:
            print('Error processing', p, e)
