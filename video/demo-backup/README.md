# Backup demo video: how it is made

Output: `docs/media/demo/`. Needs Node 23+, Python 3.13, ffmpeg, and the ElevenLabs key in the Keychain (`ELEVENLABS_API_KEY`, read only inside `tts.py`).

```sh
cd video/demo-backup && npm install
python3.13 record_pty.py recordings/agent-pays.json recordings/agent-steps.json -- bash --norc --noprofile -i   # records a real terminal run, byte for byte, with timing
node record-terminal.mjs recordings/agent-pays.json out/clips/agent-pays.webm --title "agent — bash"            # replays it in xterm.js and records the window (--slow, --fast, --cap to compress long runs)
node shoot-deck.mjs                 # deck.html -> out/deck/s1..s4.png
node record-browser.mjs             # the live site, the dashboard, the explorer, with a drawn cursor
python3.13 tts.py                   # narration.json -> out/voice/*.mp3 (ElevenLabs eleven_v3, voice Quentin)
python3.13 build.py                 # shots.json -> out/final/<shot>.mp4 and demo-backup.mp4
```

`recordings/` holds the raw terminal recordings behind the clips: Claude Code setting up a fresh Express app (2m43s), the agent paying, `npm view`. Nothing secret is in them: the keys are read as `$(stellar keys secret ...)` and never printed.
