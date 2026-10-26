"""Run a command in a real pseudo-terminal and record every byte it prints, with the time it arrived.

The recording (a JSON list of [seconds, base64 bytes]) replays byte for byte in a terminal emulator
(replay.html) so the video shows the real terminal output, not a mock-up.

Usage: python3.13 record_pty.py <out.json> <steps.json> -- <command...>
steps.json: a list of steps run in order, each {"expect": "<substring of recent output>"} or {"idle": <seconds>}
or {"sleep": <seconds>}, with an optional "send": "<text>" and "label": "<note>". The driver also answers
Claude Code's trust prompt by itself.
"""
import base64, fcntl, json, os, pty, re, select, struct, sys, termios, time

ANSI = re.compile(rb"\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07|\x1b[()][A-Za-z0-9]|\x1b[=>]|\r")
COLS, ROWS = int(os.environ.get("COLS", "120")), int(os.environ.get("ROWS", "34"))


def main():
    out_path, steps_path = sys.argv[1], sys.argv[2]
    cmd = sys.argv[sys.argv.index("--") + 1:]
    steps = json.load(open(steps_path))
    pid, fd = pty.fork()
    if pid == 0:
        os.environ["TERM"] = "xterm-256color"
        os.environ["COLUMNS"], os.environ["LINES"] = str(COLS), str(ROWS)
        os.execvp(cmd[0], cmd)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", ROWS, COLS, 0, 0))
    t0 = time.time()
    rec, plain, last_out = [], bytearray(), time.time()
    step_i, step_started, trust_done = 0, time.time(), False
    log = open(out_path + ".log", "w")

    def send(text):
        os.write(fd, text.encode())
        rec.append([round(time.time() - t0, 3), "in", base64.b64encode(text.encode()).decode()])
        log.write(f"\n[send {time.time()-t0:.1f}s] {text!r}\n"); log.flush()

    while True:
        r, _, _ = select.select([fd], [], [], 0.25)
        now = time.time()
        if r:
            try:
                data = os.read(fd, 65536)
            except OSError:
                data = b""
            if not data:
                break
            rec.append([round(now - t0, 3), "out", base64.b64encode(data).decode()])
            plain.extend(ANSI.sub(b"", data)); last_out = now
            log.write(ANSI.sub(b"", data).decode("utf-8", "replace")); log.flush()
        ctl = out_path + ".ctl"
        if os.path.exists(ctl):
            text = open(ctl, newline="").read(); os.remove(ctl); send(text)
        recent = plain[-6000:].decode("utf-8", "replace")
        if not trust_done and "Itrustthisfolder" in recent and now - last_out > 1.0:
            send("\x1b[B"); time.sleep(0.4); send("\r"); trust_done = True; plain.clear(); continue
        if step_i < len(steps):
            st = steps[step_i]
            ok = False
            if "expect" in st:
                ok = st["expect"] in recent and now - last_out > st.get("settle", 1.0)
            elif "idle" in st:
                ok = now - last_out > st["idle"] and now - step_started > st.get("min", 0)
            elif "sleep" in st:
                ok = now - step_started > st["sleep"]
            if ok:
                if "send" in st:
                    send(st["send"])
                log.write(f"\n[step {step_i} done {now-t0:.1f}s] {st.get('label','')}\n"); log.flush()
                step_i += 1; step_started = now; plain.clear()
    json.dump({"cols": COLS, "rows": ROWS, "command": cmd, "events": rec}, open(out_path, "w"))
    _, status = os.waitpid(pid, 0)
    print(f"recorded {len(rec)} chunks, {time.time()-t0:.0f}s, exit {status}")


main()
