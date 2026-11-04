title ="hello"
views = 12
published = True
image_path = None
print(type(title).__name__)
print(type(views).__name__)
print(type(published).__name__)
print(type(image_path).__name__)

title = "hello"
view = 12
published = True
image_path = None
print(type(title).__name__)
print(type(view).__name__)
print(type(published).__name__)
print(type(image_path).__name__)
size_bytes =1_500_000
size_mb = size_bytes/1_000_000
print(size_mb)
print(2 + 3 * 4)
print(2 + 3 * 4)
print(23 // 5, 23 % 5)

title = " My Story "
clean_title = title.strip()
print(clean_title)
print(clean_title[:5])
print("Go"[:5])
print(f"{clean_title}: {len(clean_title)} characters")

first = "12"
second = "8"
print(first + second)
total = int(first) + int(second)
print(total)
print(f"{total} posts published")

title = " Hello ".strip()
valid = 1 <= len(title) <= 160
if valid:
    print("Ready")
else:
    print("Check title")
