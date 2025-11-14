Drop wearable logos here to override inline SVG fallbacks.

Expected filenames:
- oura.png (or .jpg/.svg)
- fitbit.png (or .jpg/.svg)
- whoop.png (or .jpg/.svg)

Notes:
- Files are served statically at /wearables/<name>.<ext> by Vite (client/public).
- If an image is missing or fails to load, the UI falls back to built-in inline SVG icons.
- Recommended size: square 256–512px; transparent background if possible.
