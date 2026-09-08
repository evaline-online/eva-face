#!/usr/bin/env python3
"""
Universal 3D Head Server — serves identical renderer in browser + terminal.
Run: python3 server.py
Open: http://localhost:8080
Terminal: python3 ascii_head.py
"""

import http.server, os, json, sys

PORT = 8101
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIR, **kw)

    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.path = '/index.html'
        elif self.path.startswith('/models/'):
            pass  # serve OBJ files as-is
        elif self.path == '/api/models':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            models = []
            mdir = os.path.join(DIR, 'models')
            for f in sorted(os.listdir(mdir)):
                if f.endswith('.obj'):
                    models.append({'name': f, 'path': f'/models/{f}'})
            self.wfile.write(json.dumps(models).encode())
            return
        super().do_GET()

    def log_message(self, format, *args):
        pass  # quiet

if __name__ == '__main__':
    print(f"  ╔════════════════════════════════════════╗")
    print(f"  ║  3D Head Server — http://localhost:{PORT} ║")
    print(f"  ║  Terminal: python3 ascii_head.py        ║")
    print(f"  ╚════════════════════════════════════════╝")
    http.server.HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
