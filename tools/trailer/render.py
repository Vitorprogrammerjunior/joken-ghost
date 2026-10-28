"""Renderiza o comercial inteiro num comando:

    python tools/trailer/render.py

Precisa do servidor do jogo em http://localhost:5173 (npm run dev). Abre a página do comercial num
Chrome/Edge headless (perfil temporário, sem mexer no seu navegador), recebe os quadros pelo
capture.py e termina quando o MP4 fica pronto em tools/trailer/out/.
"""
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

import capture

PAGE = 'http://localhost:5173/tools/trailer/index.html?export'
TIMEOUT_S = 30 * 60
BROWSERS = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'google-chrome', 'chromium', 'chrome',
]


def find_browser():
    for b in BROWSERS:
        if Path(b).exists() or shutil.which(b):
            return b
    sys.exit('Não achei Chrome nem Edge instalado.')


def main():
    server = capture.serve()
    threading.Thread(target=server.serve_forever, daemon=True).start()
    profile = tempfile.mkdtemp(prefix='jokenghost-trailer-')
    browser = subprocess.Popen([
        find_browser(), '--headless=new', f'--user-data-dir={profile}', '--no-first-run',
        '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
        '--window-size=1080,1920', PAGE,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        if not capture.FINISHED.wait(TIMEOUT_S):
            sys.exit('O comercial não terminou a tempo.')
        print(f'Pronto: {capture.VIDEO}')
    finally:
        browser.terminate()
        browser.wait(timeout=20)
        server.shutdown()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == '__main__':
    main()
