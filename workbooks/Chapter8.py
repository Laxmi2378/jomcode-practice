#example1
from pathlib import Path
path = Path("posts") / "Draft.json"
print(path.name)
print(path.suffix)


#example2
class Post:
    def __init__(self, title: str):
        self.title = title.strip()

    def preview(self) -> str:
        return self.title[:5] 

post = Post(" Hello world ")
print(post.preview())

#example3
def image_label(path: str | None) -> str:
    return "No image" if path is None else path

print(image_label(None))
print(image_label("a/photo.png"))

#example4
import json
def main():
    print(json.dumps({"ok": True}))

if __name__ == "__main__":
    main()