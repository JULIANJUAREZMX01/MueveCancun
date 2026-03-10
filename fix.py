import re

with open('src/components/RouteCalculator.astro', 'r') as f:
    content = f.read()

# Replace the specific lines
content = re.sub(r'[ \t]*console\.log\(`🔍 Searching: \$\{origin\} -> \$\{dest\}`\);\n', '', content)
content = re.sub(r'[ \t]*console\.log\("🔍 Raw Results:", results\);\n', '', content)

with open('src/components/RouteCalculator.astro', 'w') as f:
    f.write(content)
