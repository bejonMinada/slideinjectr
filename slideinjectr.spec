# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for SlideInjectr standalone executable
Bundles FastAPI backend + React frontend into single .exe
"""

import os
from pathlib import Path

block_cipher = None

# Get absolute paths
base_dir = Path('.').resolve()
backend_dir = base_dir / 'backend'
frontend_dist = base_dir / 'frontend' / 'dist'

# Data files to include (frontend static files, backend app files)
datas = []
if frontend_dist.exists():
    datas.append((str(frontend_dist), 'frontend/dist'))

# Include entire app directory
datas.append((str(backend_dir / 'app'), 'app'))

a = Analysis(
    [str(backend_dir / 'app' / '__main__.py')],
    pathex=[str(backend_dir)],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.workers',
        'fastapi',
        'pydantic_settings',
        'app.api',
        'app.api.routes',
        'app.api.v1',
        'app.api.v1.endpoints',
        'app.core',
        'app.core.config',
        'app.schemas',
        'app.services',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludedimports=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='slideinjectr',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
