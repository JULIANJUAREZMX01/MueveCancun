from PIL import Image, ImageDraw, ImageFont
import random
import os

def generate_og_image():
    # Dimensions for Open Graph
    width = 1200
    height = 630

    # Colors
    bg_color = '#0b0f19'
    primary_color = '#00B4D8'
    secondary_color = '#9d4edd'
    text_white = '#ffffff'
    accent_green = '#10B981'

    # Create background
    img = Image.new('RGB', (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Draw decorative "bus routes" (glowing lines)
    route_colors = [primary_color, secondary_color, '#0077b6', '#7b2cbf']
    for _ in range(20):
        start_x = random.randint(0, width)
        start_y = random.randint(0, height)
        points = [(start_x, start_y)]
        for _ in range(random.randint(3, 8)):
            next_x = points[-1][0] + random.randint(-200, 200)
            next_y = points[-1][1] + random.randint(-200, 200)
            points.append((max(0, min(width, next_x)), max(0, min(height, next_y))))

        color = random.choice(route_colors)
        # Main line
        draw.line(points, fill=color, width=4, joint="curve")
        # Glow effect (simulated with wider semi-transparent-like lines if we had transparency,
        # but for RGB we just do slightly wider lines)
        draw.line(points, fill=color, width=2, joint="curve")

    # Fonts
    try:
        # Try to find a nice font
        font_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
        font_semi = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 45)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    except:
        font_bold = ImageFont.load_default()
        font_semi = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Draw Text Content
    draw.text((80, 80), "🚍 MueveCancún", fill=text_white, font=font_bold)
    draw.text((80, 190), "¿Qué ruta me lleva?", fill=primary_color, font=font_semi)

    # Draw Checklist/Features
    features = [
        "✓ Funciona sin internet (Offline-first)",
        "✓ Rutas R1, R2, R10 y más",
        "✓ Cálculo de rutas ultra rápido (WASM)",
        "✓ 100% gratis y código abierto"
    ]

    y_offset = 280
    for feature in features:
        draw.text((100, y_offset), feature, fill=text_white, font=font_small)
        y_offset += 50

    # Bottom Bar / Branding
    draw.rectangle([0, height-100, width, height], fill="#161b22")
    draw.text((80, height-70), "La guía oficial de transporte público de Cancún", fill=text_white, font=font_small)
    draw.text((width-450, height-70), "querutamellevacancun.onrender.com", fill=primary_color, font=font_small)

    img.save('public/og-image.png')
    print("Professional og-image.png generated successfully at public/og-image.png")

if __name__ == "__main__":
    generate_og_image()
