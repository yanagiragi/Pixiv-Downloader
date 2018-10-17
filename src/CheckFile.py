import os

# traverse root directory, and list directories as dirs and files as files

count = 0
for root, dirs, files in os.walk("../Storage/Follow"):
    path = root.split(os.sep)
    for file in files:
        filepath = '/'.join(path) + '/' + file
        size = os.stat(filepath).st_size
        if size == 0:
            count = count + 1
            print(filepath)
            os.remove(filepath)

print('Found 0 btye files: ', count)