title = " Hello ".strip()
valid = 1 <= len(title) <= 160
if valid:
    print("Ready")
else:
    print("Check title")
    
views = 25

if views == 0:
    label = "New"
elif views < 100:
        label = "Growing"
else:
        label = "Popular"

print(label)        

signed_in = True
used_id = "user-a"
author_id = "user-b"
can_edit = signed_in and  used_id == author_id
print(can_edit)
print(not signed_in)

image_path = None

if image_path is None:
      print("No image")

title = ""

if not title:
      print("Blank title")
print(image_path == title)

git init
