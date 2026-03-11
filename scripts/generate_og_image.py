from PIL import Image, ImageDraw, ImageFont
import random

# Create an image with dark background
width = 1200
height = 630
img = Image.new('RGB', (width, height), color='#0b0f19')
draw = ImageDraw.Draw(img)

# Draw some glowing routes
colors = ['#00B4D8', '#ff007f', '#0077b6', '#9d4edd']
for _ in range(15):
    points = [(random.randint(0, width), random.randint(0, height)) for _ in range(random.randint(3, 6))]
    color = random.choice(colors)
    draw.line(points, fill=color, width=random.randint(2, 6), joint="curve")

    # Add glowing effect by drawing larger transparent lines
    # (Pillow doesn't support glowing directly easily, so we just draw some basic lines)

# Draw text
try:
    font = ImageFont.truetype("arial.ttf", 60)
except OSError:
    font = ImageFont.load_default()

text = "MueveCancún"
draw.text((100, 100), text, fill="#ffffff", font=font)
text2 = "Transporte Público Offline"
draw.text((100, 200), text2, fill="#00B4D8", font=font)

img.save('public/og-image.png')
print("og-image.png generated")
