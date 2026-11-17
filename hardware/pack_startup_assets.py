"""Pack browser-rasterized website startup art; no external artwork or service."""
from pathlib import Path
from PIL import Image
import hashlib
root=Path(__file__).parent
out=['#pragma once', '// Generated from original index.html startup SVG and flower-meadow.png.',
     '// Run: node hardware/generate_startup_assets.cjs (Chrome + Pillow).']
for src in ['index.html','woodland.css','assets/backgrounds/flower-meadow.png']:
    out.append('// '+src+' SHA256 '+hashlib.sha256((root.parent/src).read_bytes()).hexdigest())
for name,width,height in [('background',240,280),('logo',212,104)]:
    im=Image.open(root/'tests/ui-output'/('startup-'+name+'.png')).convert('RGBA')
    assert im.size==(width,height),im.size
    pixels=list(im.getdata());rgb=[((r>>3)<<11)|((g>>2)<<5)|(b>>3) for r,g,b,a in pixels]
    out.append('static const uint16_t STARTUP_'+name.upper()+'[] = {')
    out.extend(','.join(map(str,rgb[n:n+32]))+',' for n in range(0,len(rgb),32));out.append('};')
    if name=='logo':
        alpha=[p[3] for p in pixels]
        assert 0 in alpha and 255 in alpha,'Logo must have transparent background'
        out.append('static const uint8_t STARTUP_ALPHA[] = {')
        out.extend(','.join(map(str,alpha[n:n+64]))+',' for n in range(0,len(alpha),64));out.append('};')
(root/'Eumo169/StartupArt.h').write_text('\n'.join(out)+'\n')
print('Packed original Eumo startup background 240x280 and transparent logo 212x104.')
