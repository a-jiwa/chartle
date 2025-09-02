from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta
import os
import time  # for sleep

# Settings
start_date = datetime(2025, 7, 2)
end_date = datetime(2025, 7, 8)  # Adjust as needed
output_dir = "screenshots"
viewport_width = 1920
viewport_height = 1080

# Rectangle area to capture (adjust these numbers)
clip_area = {
    "x": 600,
    "y": 60,
    "width": 720,
    "height": 740
}

os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        filename_2x = os.path.join(output_dir, f"{date_str}@2x.png")

        print(f"Capturing {date_str} -> 2x resolution")

        # Open page with 2x resolution
        page = browser.new_page(
            viewport={"width": viewport_width, "height": viewport_height},
            device_scale_factor=2
        )
        page.goto(f"https://chartle.cc/?d={date_str}", wait_until="networkidle")

        # Close popup if it exists
        try:
            popup_button = page.locator("button:has-text('Got it!')")
            if popup_button.is_visible():
                popup_button.click()
        except:
            print("No popup found or could not close it.")

        # Wait 3 seconds for animations
        time.sleep(3)

        # Hide cursor & move mouse
        page.add_style_tag(content="* { cursor: none !important; }")
        page.mouse.move(0, 0)

        # Take 2x screenshot
        page.screenshot(path=filename_2x, clip=clip_area)
        page.close()

        current_date += timedelta(days=1)

    browser.close()
