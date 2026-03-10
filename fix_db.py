import re

with open('src/utils/db.ts', 'r') as f:
    content = f.read()

# Remove the unused `source` variable
content = re.sub(r"let source = '';\s*", "", content)
content = re.sub(r"source = 'muevecancun_balance';\s*", "", content)
content = re.sub(r"source = 'user_balance';\s*", "", content)

with open('src/utils/db.ts', 'w') as f:
    f.write(content)
