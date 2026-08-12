import base64
from io import BytesIO

import qrcode


def build_qr_image(payload: str) -> str:
    """Renders payload as a QR code PNG, returned as a data: URI so the
    frontend can drop it straight into an <img src>, no separate endpoint
    or file storage needed for something this small.
    """
    image = qrcode.make(payload)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"
