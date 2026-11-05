titles = ["Hello", "Launch"]
for number, title in enumerate(titles, start=1):
    print(f"{number}. {title}")

posts = [{"title": "Hello", "views": 2},
         {"title": "Launch", "views": 12}]
popular = [p["title"].upper() for p in posts
           if p["views"] >= 10]
print(popular)

attempt = 0
while attempt < 3:
    attempt += 1
    print(f"Attempt {attempt}")

views = [3 , 0, 7]
total = 0
for view in views:
    total += view
print(total)
for value in views:
    if value == 0:
        print("Unviewed posts found")
        break