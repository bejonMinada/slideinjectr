import os
import tempfile
from pathlib import Path
from subprocess import CalledProcessError, run
from uuid import uuid4

from fastapi import HTTPException


def render_template_preview(template_path: Path, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    # Keep LibreOffice runtime/profile in container-local temp to avoid issues on mounted host volumes.
    runtime_base = Path(tempfile.gettempdir()) / "slideinjectr-libreoffice"
    runtime_base.mkdir(parents=True, exist_ok=True)
    profile_dir = runtime_base / f"profile-{uuid4().hex}"
    profile_dir.mkdir(parents=True, exist_ok=True)
    process_env = os.environ.copy()
    process_env["SAL_DISABLE_JAVA"] = "1"
    process_env["HOME"] = str(runtime_base)

    try:
        result = run(
            [
                "soffice",
                f"-env:UserInstallation=file://{profile_dir.as_posix()}",
                "--headless",
                "--invisible",
                "--nologo",
                "--nodefault",
                "--norestore",
                "--convert-to",
                "pdf",
                "--outdir",
                str(output_dir),
                str(template_path),
            ],
            capture_output=True,
            text=True,
            check=True,
            env=process_env,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail="Preview rendering is unavailable: LibreOffice is not installed.") from exc
    except CalledProcessError as exc:
        message = exc.stderr.strip() or exc.stdout.strip() or "Unknown conversion error"
        raise HTTPException(status_code=500, detail=f"Preview rendering failed: {message}") from exc

    pdf_path = output_dir / f"{template_path.stem}.pdf"
    if not pdf_path.exists():
        stdout_text = result.stdout.strip() if result.stdout else ""
        raise HTTPException(
            status_code=500,
            detail=f"Preview rendering did not produce a PDF file. {stdout_text}".strip(),
        )

    renamed_path = output_dir / f"preview-{uuid4().hex}.pdf"
    pdf_path.replace(renamed_path)
    return renamed_path