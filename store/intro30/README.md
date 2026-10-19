# ZenTab intro (30 s, 1920×1080)

Live footage of the extension, cut into one film. `intro30.html` draws any frame at time `t`
(`window.render(t)` seeks the clips exactly), so every frame is repeatable.

| Time | Scene |
|---|---|
| 0–3 s | "Mỗi tab mới. / Một khoảng lặng." |
| 3–6.7 s | Typing the morning intention (live) |
| 6.7–10.5 s | Eight wallpapers in turn, named |
| 10.5–14.3 s | Focus: open the line, pick a task, start the timer (live) |
| 14.3–22.5 s | "Giờ nghỉ, thật sự nghỉ." — Thở, Bong bóng, Vườn cát, Xếp đá, Thả đèn (live) |
| 22.5–26 s | Turning a notebook page, then the daily greeting (live) |
| 26–27.4 s | What else is inside |
| 27.4–30 s | End card |

## Rebuild

```sh
export CHROME_PATH="/path/to/Chrome for Testing"   # needs puppeteer-core and ffmpeg
# 1. (optional) re-record footage and wallpaper stills from the built extension
node record.js path/to/unzipped-extension /tmp/profile clips
cp clips/wp-*.jpg assets/
# 2. clips → every-frame-a-keyframe MP4 so seeking is exact
for c in clips/*.webm; do ffmpeg -y -i "$c" -r 30 -c:v libx264 -crf 16 -g 1 -pix_fmt yuv420p -an "assets/$(basename "${c%.webm}").mp4"; done
# 3. frames (FROM/TO pick a frame range, default all 900), then encode with the bundled music
node render.js intro30.html frames full
ffmpeg -framerate 30 -i frames/%04d.png -t 30 -i ../../sounds/zentab-music.m4a \
  -filter_complex "[1:a]afade=t=in:st=0:d=1.2,afade=t=out:st=27.8:d=2.2[a]" \
  -map 0:v -map "[a]" -c:v libx264 -crf 17 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 192k -shortest ZenTab-intro-30s.mp4
```
