#!/usr/bin/env python3
"""Stream a local file to a Google Drive resumable-upload session URI (X-Goog-Upload protocol).
Usage: drive_upload.py <file> <session_uri>
The URI is pre-authorized -> no credentials needed on the runner. Resumes on failure."""
import os, sys, time, urllib.request, urllib.error

CHUNK = 8 * 1024 * 1024  # 8 MiB, multiple of 256 KiB

def req(uri, headers, data=None):
    r = urllib.request.Request(uri, data=data, method="PUT" if data is not None else "POST", headers=headers)
    try:
        with urllib.request.urlopen(r, timeout=180) as resp:
            return resp.status, dict(resp.headers), resp.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode(errors="replace")

def query_offset(uri):
    st, h, body = req(uri, {"X-Goog-Upload-Command": "query", "Content-Length": "0"}, data=b"")
    return int(h.get("X-Goog-Upload-Size-Received", "0")), h.get("X-Goog-Upload-Status")

def main(path, uri):
    total = os.path.getsize(path)
    offset, status = query_offset(uri)
    print(f"start at offset {offset}, status={status}, total={total}")
    with open(path, "rb") as f:
        while True:
            f.seek(offset)
            data = f.read(CHUNK)
            last = offset + len(data) >= total
            cmd = "upload, finalize" if last else "upload"
            st, h, body = req(uri, {
                "X-Goog-Upload-Command": cmd,
                "X-Goog-Upload-Offset": str(offset),
                "Content-Length": str(len(data)),
                "Content-Type": "application/octet-stream"}, data=data)
            ustat = h.get("X-Goog-Upload-Status")
            if st in (200, 201) and ustat == "final":
                print(f"DONE {total} bytes -> {body[:300]}"); return 0
            if st in (200, 201) and ustat == "active":
                offset += len(data)
                print(f"  {offset/total*100:5.1f}% ({offset}/{total})", flush=True); continue
            if st in (500, 502, 503, 504) or st == 0:
                print(f"server {st}, resuming..."); time.sleep(5)
                offset, _ = query_offset(uri); continue
            print("FAILED", st, ustat, body[:500]); return 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
