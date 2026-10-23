"""Serve the Nicey Burger Junction frontend for local development.

Business data and authentication are handled by Supabase; this server only
exposes the site's HTML and browser assets. Run with ``python app.py``.
"""

from argparse import ArgumentParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from site_config import render_public_config


ROOT = Path(__file__).resolve().parent
PAGE_DIRECTORIES = {"admin", "customer", "operations"}
ASSET_EXTENSIONS = {
    ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp",
    ".gif", ".ico", ".woff", ".woff2", ".ttf", ".json",
}


class SiteHandler(SimpleHTTPRequestHandler):
    """Serve public pages without exposing project files or directories."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _public_path(self):
        try:
            path = unquote(urlsplit(self.path).path, errors="strict")
        except UnicodeDecodeError:
            return None
        if path == "/":
            path = "/index.html"
        if not path.startswith("/") or "\\" in path or "\0" in path:
            return None
        parts = path.lstrip("/").split("/")
        if any(not part or part.startswith(".") for part in parts):
            return None
        relative = Path(*parts)
        if len(parts) == 1:
            allowed = relative.suffix.lower() == ".html"
        elif parts[0] in PAGE_DIRECTORIES and len(parts) == 2:
            allowed = relative.suffix.lower() == ".html"
        elif parts[0] == "assets" and len(parts) >= 3:
            allowed = relative.suffix.lower() in ASSET_EXTENSIONS
        else:
            allowed = False
        if not allowed:
            return None
        current = ROOT
        for part in parts:
            current /= part
            if current.is_symlink():
                return None
        target = (ROOT / relative).resolve()
        try:
            target.relative_to(ROOT)
        except ValueError:
            return None
        return relative if target.is_file() else None

    def _serve_public(self, head_only=False):
        relative = self._public_path()
        if relative is None:
            self.send_error(404, "Page not found")
            return
        if relative.as_posix() == "assets/js/config.js":
            body = render_public_config(ROOT)
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if not head_only:
                self.wfile.write(body)
            return
        self.path = "/" + relative.as_posix()
        if head_only:
            super().do_HEAD()
        else:
            super().do_GET()

    def do_GET(self):
        self._serve_public()

    def do_HEAD(self):
        self._serve_public(head_only=True)

    def send_error(self, code, message=None, explain=None):
        if code != 404:
            super().send_error(code, message, explain)
            return
        body = (ROOT / "404.html").read_bytes()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()


def main():
    parser = ArgumentParser(description="Run the Nicey Burger Junction website")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    with ThreadingHTTPServer((args.host, args.port), SiteHandler) as server:
        print(f"Open http://{args.host}:{server.server_port}/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server.")


if __name__ == "__main__":
    main()
