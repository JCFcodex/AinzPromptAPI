# Python Examples

## Blocking Chat

```python
import requests

BASE_URL = "https://ainzpromptapi.onrender.com"
SESSION_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479"

response = requests.post(
    f"{BASE_URL}/api/chat",
    json={
        "message": "Summarize the theory of relativity",
        "sessionId": SESSION_ID,
        "model": "llama-3.3-70b-versatile",
    },
)

data = response.json()
print("Reply:", data["reply"])
print("Tokens used:", data["usage"]["total_tokens"])
```

## SSE Streaming

```python
import httpx

with httpx.stream(
    "POST",
    f"{BASE_URL}/api/stream",
    json={
        "message": "Write a Python quicksort implementation",
        "sessionId": SESSION_ID,
    },
) as response:
    for line in response.iter_lines():
        if line.startswith("data: "):
            token = line[6:]
            if token == "[DONE]":
                break
            if token.startswith("[ERROR]"):
                print(f"\nError: {token}")
                break
            print(token, end="", flush=True)
```

## Vision — Image URL

```python
response = requests.post(
    f"{BASE_URL}/api/chat",
    json={
        "sessionId": SESSION_ID,
        "content": [
            {"type": "text", "text": "What objects are in this image?"},
            {
                "type": "image_url",
                "image_url": {"url": "https://example.com/photo.jpg"},
            },
        ],
    },
)
print(response.json()["reply"])
```

## Vision — Base64 Local Image

```python
import base64

with open("invoice.jpg", "rb") as f:
    base64_image = base64.b64encode(f.read()).decode("utf-8")

response = requests.post(
    f"{BASE_URL}/api/chat",
    json={
        "sessionId": SESSION_ID,
        "content": [
            {"type": "text", "text": "Extract the invoice total."},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
            },
        ],
    },
)
print(response.json()["reply"])
```

## Single Image Upload

```python
with open("diagram.png", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/api/chat/upload",
        files={"image": ("diagram.png", f, "image/png")},
        data={
            "message": "Explain this architecture diagram",
            "sessionId": SESSION_ID,
        },
    )

print(response.json()["reply"])
```

## Multiple Image Upload

```python
files = [
    ("images", ("chart1.png", open("chart1.png", "rb"), "image/png")),
    ("images", ("chart2.png", open("chart2.png", "rb"), "image/png")),
]

response = requests.post(
    f"{BASE_URL}/api/chat/upload/multiple",
    files=files,
    data={
        "message": "Compare these two charts",
        "sessionId": SESSION_ID,
    },
)

data = response.json()
print(f"Processed {data['imagesProcessed']} images")
print(data["reply"])
```
