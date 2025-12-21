#!/usr/bin/env python3
"""
Generate PWA icons for Shopping List app
Requires: Pillow (pip install Pillow)
"""

import os
from PIL import Image, ImageDraw, ImageFont

# Sizes needed for PWA
SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

# Colors
BG_COLOR = (76, 175, 80)  # #4CAF50
TEXT_COLOR = (255, 255, 255)

# Output directory
OUTPUT_DIR = "src/assets/icons"

def create_icon(size):
    """Create a single icon with shopping cart emoji"""

    # Create image with green background
    img = Image.new('RGB', (size, size), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Try to use a system font
    try:
        # Font size is proportional to icon size
        font_size = int(size * 0.6)
        # Try different font paths for different systems
        font_paths = [
            "/System/Library/Fonts/Apple Color Emoji.ttc",  # macOS
            "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",  # Linux
            "C:\\Windows\\Fonts\\seguiemj.ttf",  # Windows
        ]

        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, font_size)
                break

        if not font:
            # Fallback to default font
            font = ImageFont.load_default()
            print(f"Warning: Using default font for {size}x{size}")

        # Draw shopping cart emoji or text
        text = "🛒"

        # Get text bounding box
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Center the text
        x = (size - text_width) // 2 - bbox[0]
        y = (size - text_height) // 2 - bbox[1]

        draw.text((x, y), text, font=font, fill=TEXT_COLOR)

    except Exception as e:
        print(f"Could not draw emoji for {size}x{size}: {e}")
        # Fallback: draw a simple cart shape
        draw_simple_cart(draw, size)

    return img

def draw_simple_cart(draw, size):
    """Draw a simple shopping cart shape as fallback"""

    # Scale factor
    s = size / 100

    # Cart body (rectangle)
    cart_left = 20 * s
    cart_top = 30 * s
    cart_right = 80 * s
    cart_bottom = 70 * s

    draw.rectangle(
        [cart_left, cart_top, cart_right, cart_bottom],
        outline=(255, 255, 255),
        width=int(3 * s)
    )

    # Cart wheels (circles)
    wheel_radius = 5 * s
    wheel1_x = 35 * s
    wheel2_x = 65 * s
    wheel_y = 80 * s

    draw.ellipse(
        [wheel1_x - wheel_radius, wheel_y - wheel_radius,
         wheel1_x + wheel_radius, wheel_y + wheel_radius],
        fill=(255, 255, 255)
    )

    draw.ellipse(
        [wheel2_x - wheel_radius, wheel_y - wheel_radius,
         wheel2_x + wheel_radius, wheel_y + wheel_radius],
        fill=(255, 255, 255)
    )

    # Handle
    draw.line(
        [cart_left, cart_top, cart_left - 10 * s, cart_top - 15 * s],
        fill=(255, 255, 255),
        width=int(3 * s)
    )

def main():
    """Generate all icons"""

    # Create output directory if it doesn't exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Generating PWA icons...")
    print(f"Output directory: {OUTPUT_DIR}")
    print()

    for size in SIZES:
        filename = f"icon-{size}x{size}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)

        print(f"Creating {filename}...")

        # Create and save icon
        icon = create_icon(size)
        icon.save(filepath, "PNG")

        print(f"  ✓ Saved to {filepath}")

    print()
    print("✅ All icons generated successfully!")
    print(f"📁 Icons saved to: {os.path.abspath(OUTPUT_DIR)}")

if __name__ == "__main__":
    try:
        main()
    except ImportError:
        print("❌ Error: Pillow library not found")
        print("Install it with: pip install Pillow")
        print()
        print("Alternatively, use the generate-icons.html file in your browser")
    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("Try using the generate-icons.html file in your browser instead")
