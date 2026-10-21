"""Servidor local de desenvolvimento sem cache (para ver mudanças na hora).

    python tools/devserver.py [porta]
"""
import contextlib
import http.server
import os
import socket
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.svg': 'image/svg+xml',
        '.otf': 'font/otf',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class DualStackServer(http.server.ThreadingHTTPServer):
    """Escuta IPv4 e IPv6 (no Windows, 'localhost' tenta ::1 primeiro e fica lento sem isso)."""
    address_family = socket.AF_INET6

    def server_bind(self):
        with contextlib.suppress(Exception):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        return super().server_bind()


if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(__file__), '..'))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    print(f'JokenGhost em http://localhost:{port}', flush=True)
    DualStackServer(('::', port), NoCacheHandler).serve_forever()
