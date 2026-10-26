"""Assemble the backup demo video: each shot is a clip (a still, a browser recording or a terminal replay)
with its narration lines placed at given seconds; the clip is held on its last frame or cut to the shot's
length, then every shot is joined into one file.

Usage: python3.13 build.py [shot ...]      -> out/final/<shot>.mp4 for each shot, then out/final/demo-backup.mp4
shots.json: [{"name", "video", "kind": "still"|"clip", "lines": [{"id", "at"}], "length"?, "speed"?}]
"""
import json, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"; FINAL = OUT / "final"; FINAL.mkdir(parents=True, exist_ok=True)
VOICE = OUT / "voice"; DUR = json.load(open(VOICE / "durations.json"))
PAD = 1.0  # seconds after the last word


def ffprobe(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                capture_output=True, text=True, check=True).stdout.strip())


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"ffmpeg failed: {' '.join(cmd)}\n{r.stderr[-2000:]}")


def shot(s):
    name, kind, video = s["name"], s["kind"], HERE / s["video"]
    lines = s["lines"]
    end_of_voice = max(l["at"] + DUR[l["id"]] for l in lines)
    total = s.get("length") or (end_of_voice + PAD)
    # voice track: each line delayed to its second, mixed, padded to the shot length
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for l in lines:
        cmd += ["-i", str(VOICE / f"{l['id']}.mp3")]
    chains = "".join(f"[{i}]adelay={int(l['at']*1000)}|{int(l['at']*1000)}[a{i}];" for i, l in enumerate(lines))
    mix = "".join(f"[a{i}]" for i in range(len(lines))) + f"amix=inputs={len(lines)}:normalize=0,apad=whole_dur={total}[v]"
    voice = FINAL / f"_{name}.m4a"
    run(cmd + ["-filter_complex", chains + mix, "-map", "[v]", "-t", str(total), "-c:a", "aac", "-b:a", "160k", str(voice)])
    out = FINAL / f"{name}.mp4"
    vf = "scale=1280:720:force_original_aspect_ratio=decrease:flags=lanczos,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=#0d1117,format=yuv420p"
    if kind == "still":
        run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-framerate", "30", "-t", str(total), "-i", str(video), "-i", str(voice),
             "-vf", vf + ",fade=t=in:st=0:d=0.4", "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-r", "30", "-c:a", "copy", "-shortest", str(out)])
    else:
        speed = s.get("speed", 1.0)
        vlen = ffprobe(video) / speed
        pre = f"setpts={1/speed:.4f}*PTS," if speed != 1.0 else ""
        pad = f",tpad=stop_mode=clone:stop_duration={max(0.0, total - vlen) + 1:.2f}"
        run(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-i", str(voice), "-t", str(total), "-map", "0:v", "-map", "1:a",
             "-vf", pre + vf + pad, "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-r", "30", "-c:a", "copy", str(out)])
    print(f"{name}: {total:.1f}s (clip {ffprobe(out):.1f}s)", flush=True)
    return out


SHOTS = json.load(open(HERE / "shots.json"))
only = set(sys.argv[1:])
for s in SHOTS:
    if not only or s["name"] in only:
        shot(s)
ready = [FINAL / f"{s['name']}.mp4" for s in SHOTS if (FINAL / f"{s['name']}.mp4").exists()]
if len(ready) == len(SHOTS):
    (FINAL / "_all.txt").write_text("".join(f"file '{m.as_posix()}'\n" for m in ready))
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(FINAL / "_all.txt"), "-c", "copy", "-movflags", "+faststart", str(FINAL / "demo-backup.mp4")])
    print("demo-backup.mp4", round(ffprobe(FINAL / "demo-backup.mp4"), 1), "s")
else:
    print(f"{len(ready)}/{len(SHOTS)} shots built; the combined file waits for the rest")
