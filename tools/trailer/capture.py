"""Recebe os quadros (PNG) e o áudio (WAV) da página do comercial e monta o MP4.

    python tools/trailer/capture.py

Depois abra http://localhost:5173/tools/trailer/ (com o servidor do jogo rodando) e clique em
EXPORTAR MP4. O vídeo sai em tools/trailer/out/jokenghost-comercial.mp4 (H.264 + AAC, 1080x1920, 30 fps).
O ffmpeg vem do pacote Python imageio-ffmpeg (pip install imageio-ffmpeg).
"""
import json
import shutil
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import imageio_ffmpeg

PORT = 5199
FPS = 30
OUT = Path(__file__).resolve().parent / 'out'
FRAMES = OUT / 'frames'
VIDEO = OUT / 'jokenghost-comercial.mp4'

# avisado quando o MP4 fica pronto (o render.py espera por ele)
FINISHED = threading.Event()


def encode():
    """Quadros + áudio -> MP4 pronto para redes sociais (yuv420p, faststart)."""
    cmd = [
        imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error',
        '-framerate', str(FPS), '-i', str(FRAMES / '%04d.png'),
        '-i', str(OUT / 'audio.wav'),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', str(VIDEO),
    ]
    subprocess.run(cmd, check=True)


class Handler(BaseHTTPRequestHandler):
    # conexão persistente: o navegador manda os 900 quadros pela mesma conexão
    # (uma conexão por quadro esgota as conexões aceitas pelo Windows)
    protocol_version = 'HTTP/1.1'

    def _reply(self, code=200, body=None):
        data = json.dumps(body or {}).encode()
        self.send_response(code)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        if urlparse(self.path).path == '/ping':
            return self._reply(body={'ok': True})
        self._reply(404)

    def do_POST(self):
        url = urlparse(self.path)
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        if url.path == '/start':
            shutil.rmtree(FRAMES, ignore_errors=True)
            FRAMES.mkdir(parents=True, exist_ok=True)
            return self._reply(body={'ok': True})
        if url.path == '/frame':
            i = int(parse_qs(url.query)['i'][0])
            (FRAMES / f'{i:04d}.png').write_bytes(body)
            return self._reply(body={'ok': True})
        if url.path == '/audio':
            (OUT / 'audio.wav').write_bytes(body)
            return self._reply(body={'ok': True})
        if url.path == '/cover':
            (OUT / 'capa.png').write_bytes(body)
            return self._reply(body={'ok': True})
        if url.path == '/finish':
            encode()
            self._reply(body={'file': str(VIDEO)})
            FINISHED.set()
            return None
        self._reply(404)

    def log_message(self, *args):
        pass  # sem uma linha por quadro no terminal


def serve():
    OUT.mkdir(parents=True, exist_ok=True)
    return ThreadingHTTPServer(('127.0.0.1', PORT), Handler)


if __name__ == '__main__':
    print(f'capture.py ouvindo em http://127.0.0.1:{PORT} (saída: {OUT})')
    serve().serve_forever()
