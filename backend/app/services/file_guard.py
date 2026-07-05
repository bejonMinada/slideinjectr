from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile


def ensure_allowed_file(filename: str, allowed_extensions: tuple[str, ...]) -> None:
    ext = Path(filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(allowed_extensions)}",
        )
async def persist_upload(upload: UploadFile, base_dir: str, max_size_mb: int) -> Path:
    Path(base_dir).mkdir(parents=True, exist_ok=True)
    ext = Path(upload.filename or "").suffix
    target_path = Path(base_dir) / f"{uuid4().hex}{ext}"
    max_bytes = max_size_mb * 1024 * 1024
    written = 0

    with target_path.open("wb") as out_file:
        while chunk := await upload.read(1024 * 1024):
            written += len(chunk)
            if written > max_bytes:
                target_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"Uploaded file exceeds max size of {max_size_mb} MB.",
                )
            out_file.write(chunk)

    await upload.close()
    return target_path
