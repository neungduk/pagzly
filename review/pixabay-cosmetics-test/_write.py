import pathlib
content = open(r"review\pixabay-cosmetics-test\_script-body.txt", encoding="utf-8").read()
pathlib.Path(r"review\pixabay-cosmetics-test\_run-inline-qa.ts").write_text(content, encoding="utf-8")
print("ok")
