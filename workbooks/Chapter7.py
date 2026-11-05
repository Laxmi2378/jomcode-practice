def preview(text, limit=5):
    return text.strip()[:limit]

print(preview(" Hello World "))
print(preview(" Hello World ", limit=8))

def clean_fields(title, body):
    return title.strip(), body.strip()

title, body = clean_fields(" Hi ", " Welcome")
print(title)
print(body)

title = " outside"
def label():
    title = "Inside"
    return title

print(label())
print(title)

def can_edit(user_id, author_id):
    if user_id is None:
        return False
    return user_id == author_id

print(can_edit(None, "a"))
print(can_edit("a", "a"))
