titles = ["Hello, Learning"]
titles.append("Launch")
print(titles[0])
print(titles[-1])
print(len(titles))

post = {"id": 1, "p1": "Post 1", "title": "Hello"}
post["title"] = "Updated"
print(post["title"])
print(post.get("image_path"))
print("title" in post)

dimensions = (640, 480)
width, height = dimensions
authors = {"Ada", "Lin", "Ada"}
print(width, height)
print(sorted(authors))

post = {"title": "Original"}
alias = post
copy = post.copy()
alias["title"] = "Changed"
print(post["title"])
print(copy["title"])


