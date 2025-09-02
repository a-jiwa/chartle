from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta
import os
import time  # for sleep

# Settings
start_date = datetime(2025, 7, 2)
end_date = datetime(2025, 7, 10)  # Adjust as needed
output_dir = "screenshots"

# Settings for mobile look
viewport_width = 512   # typical mobile width (e.g. iPhone 12/13/14 Pro)
viewport_height = 932  # typical mobile height
device_scale_factor = 3  # higher scale for retina screens

# Rectangle area to capture (adjust these numbers)
clip_area = {
    "x": 0,
    "y": 60,
    "width": 512,
    "height": 640
}

os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        filename_2x = os.path.join(output_dir, f"{date_str}@2x.png")

        print(f"Capturing {date_str} -> mobile view")

        # Open page with mobile viewport and user agent
        page = browser.new_page(
            viewport={"width": viewport_width, "height": viewport_height},
            device_scale_factor=device_scale_factor,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1"
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
