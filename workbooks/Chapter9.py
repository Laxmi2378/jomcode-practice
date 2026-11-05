#example1
def parse_count(text):
        try:
                return int(text)
        except ValueError:
                 return None

print(parse_count("12"))
print(parse_count("twelve"))

#example2

def clean_title(text):
    title = text.strip()

    if not title:
        raise ValueError("Title is required")

    return title

try:
       clean_title("    ")
except ValueError as error:
         print(error)


#example3

def allowed_size(size):
       return 0 < size <=5 * 1024 * 1024

assert not allowed_size(0)
assert allowed_size(5 * 1024 * 1024)
assert not allowed_size(5 * 1024 * 1024 + 1)
print("3 checks passed")

#example4

raw = "   Hello   "
cleaned = raw.strip()
print(repr(raw), len(raw))
print(repr(cleaned), len(cleaned))
assert len(cleaned) ==5

#exercise1
age = int(input("Enter your age please:"))
print(f"Hi, i'm {age}")

holiday = str(input("Enter your country"))
print(f"My best holiday is {holiday} in 2026")


