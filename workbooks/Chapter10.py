#example1
import json
post = {"title": "Hello", "image": None}
encoded = json.dumps(post)
decoded = json.loads(encoded)
print(encoded)
print(decoded == post)

#example2
from pathlib import Path
from tempfile import TemporaryDirectory
with TemporaryDirectory() as folder:
    path = Path(folder) / "draft.txt"
    with path.open("w", encoding="utf-8") as file:
        file.write("Hello, JomCode")
    print(path.read_text(encoding="utf-8"))

#example3
import os
origin = os.getenv("FROTEND_ORIGIN", "http://localhost:5173")
print(origin)
print(bool(os.getenv("SUPERBASE_DB_URL")))

#example4
import sys
from importlib.metadata import PackageNotFoundError, version
print(sys.executable)
try:
    print(version("fastapi"))
except PackageNotFoundError:
    print("FastAPI is not installed in this interpreter")