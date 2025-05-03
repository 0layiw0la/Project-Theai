import os
import requests
import time

# Set API endpoint and directory
url = "http://127.0.0.1:8000/submit/"
image_folder = "C:/Users/USER/Desktop/HACKATHONS/META X NITHUB/Project Theia/Project-Theai/test_images"

# Collect the first 10 image files in the folder
image_files = [
    ("files", (fname, open(os.path.join(image_folder, fname), "rb"), "image/jpeg"))
    for fname in os.listdir(image_folder)
    if fname.lower().endswith((".jpg", ".jpeg", ".png"))
][:10]  # Limit to 10 images

# Measure time
start_time = time.time()

# Send POST request
response = requests.post(url, files=image_files)

# Measure end time
end_time = time.time()

# Show the result
print(f"Status Code: {response.status_code}")
try:
    print("Response JSON:", response.json())
except Exception as e:
    print("Failed to decode JSON:", e)
    print(response.text)

# Print time taken in minutes
print(f"Time taken: {(end_time - start_time) / 60:.2f} minutes")
