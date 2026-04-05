import base64
import io
import os

import qrcode
from PIL import Image

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class QRService:
    """Generates QR codes for AgroChain product verification."""

    def generate_qr_base64(self, product_id: int, batch_number: str) -> str:
        """
        Generate a QR code that encodes the product verification URL directly.
        Scanning this QR code navigates straight to the verify page.
        Returns the QR image as a base64-encoded PNG string.
        """
        verify_url = f"{FRONTEND_URL}/verify/{product_id}"

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(verify_url)
        qr.make(fit=True)

        img: Image.Image = qr.make_image(fill_color="black", back_color="white")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        encoded = base64.b64encode(buffer.read()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"


qr_service = QRService()
