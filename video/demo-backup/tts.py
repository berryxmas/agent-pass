"""Record every narration line with ElevenLabs eleven_v3 (voice Quentin, the one the Owner accepted on the explainer).
The key is read from the Keychain inside this script and never printed. Files are cached in out/voice/.
Usage: python3.13 tts.py            (delete out/voice to re-record)
"""
import base64, json, subprocess, sys, time, urllib.error, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out" / "voice"
VOICE = sys.argv[1] if len(sys.argv) > 1 else "Aa6nEBJJMKJwJkCx8VU2"
KEY = subprocess.run(["security", "find-generic-password", "-s", "ELEVENLABS_API_KEY", "-w"],
                     capture_output=True, text=True, check=True).stdout.strip()


def say(line):
    mp3 = OUT / f"{line['id']}.mp3"
    if mp3.exists():
        return "cached"
    body = json.dumps({"text": line["tag"] + line["text"], "model_id": "eleven_v3",
                       "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128",
        data=body, headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                mp3.write_bytes(r.read())
            return "ok"
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 5:
                raise RuntimeError(f"{line['id']}: HTTP {e.code} {e.read()[:200]!r}")
            time.sleep(3 + attempt * 3)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for line in json.load(open(HERE / "narration.json")):
        print(line["id"], say(line), flush=True)
    durations = {}
    for line in json.load(open(HERE / "narration.json")):
        d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(OUT / f"{line['id']}.mp3")],
                           capture_output=True, text=True, check=True).stdout.strip()
        durations[line["id"]] = round(float(d), 2)
    json.dump(durations, open(OUT / "durations.json", "w"), indent=1)
    print(durations, "total", round(sum(durations.values()), 1))
