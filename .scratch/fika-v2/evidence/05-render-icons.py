# Rasterises mobile/assets/source/fika-glyph.svg into every image app.json and the iOS .icon bundle use.
# Frames the glyph by widening its viewBox (the glyph spans 75 of its 100 units), optionally on the accent ground,
# screenshots each framing with headless Chrome at 1024 px (smaller windows get a wider viewport and come out off
# centre), then scales it down to its size with ImageMagick.
import os, re, subprocess, sys
MOBILE = sys.argv[1]
OUT = sys.argv[2]
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
ACCENT = '#F28C38'
src = open(os.path.join(MOBILE, 'assets/source/fika-glyph.svg')).read()
body = re.search(r'<g[\s\S]*</g>', src).group(0)

def framed(span, ground):
    o = 50 - span / 2
    rect = f'<rect x="{o}" y="{o}" width="{span}" height="{span}" fill="{ground}"/>' if ground else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="{o} {o} {span} {span}">{rect}{body}</svg>'

# name: (pixels, viewBox span, ground). Span 134 puts the glyph at 56% of the icon; 165 keeps it inside Android's
# adaptive-icon safe zone; 107 fills the favicon; 80 fills the splash image.
jobs = {
    'images/icon.png': (1024, 134, ACCENT),
    'images/android-icon-foreground.png': (512, 165, None),
    'images/android-icon-monochrome.png': (432, 165, None),
    'images/favicon.png': (48, 107, ACCENT),
    'images/splash-icon.png': (456, 80, None),
    'expo.icon/Assets/fika-glyph.png': (1024, 134, None),
}
os.makedirs(OUT, exist_ok=True)
for name, (px, span, ground) in jobs.items():
    svg = os.path.join(OUT, name.replace('/', '_') + '.svg')
    open(svg, 'w').write(framed(span, ground))
    png = os.path.join(MOBILE, 'assets', name)
    big = svg + '.png'
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--window-size=1024,1024', '--default-background-color=00000000', f'--screenshot={big}',
                    'file://' + svg], check=True, capture_output=True)
    # Opaque where there is a ground (an app icon must have no alpha), transparent where there is none.
    alpha = ['-background', ground, '-alpha', 'remove', '-alpha', 'off'] if ground else []
    out = ('PNG24:' if ground else 'PNG32:') + png
    subprocess.run(['magick', big, *alpha, '-filter', 'Lanczos', '-resize', f'{px}x{px}', out], check=True)
    print(name, px)
