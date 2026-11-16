# ZenTab intro (15,5 s, 1920×1080)

`intro.html` is the whole film as one page: `window.render(t)` draws the frame at time `t`
(seconds), so every frame is exact and repeatable. Screenshots of the app are in `assets/`.

Render frames, then encode with the bundled music:

```sh
CHROME_PATH="/path/to/Chrome" node render.js intro.html frames full   # needs puppeteer-core
ffmpeg -framerate 30 -i frames/%04d.png -t 15.5 -i ../../sounds/zentab-music.m4a \
  -filter_complex "[1:a]afade=t=in:st=0:d=1.2,afade=t=out:st=13.6:d=1.9[a]" \
  -map 0:v -map "[a]" -c:v libx264 -crf 17 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 192k -shortest ZenTab-intro-15s.mp4
```

`node render.js intro.html preview preview` renders nine key frames to check a change quickly.
