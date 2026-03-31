import requests

b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

data = {
    "name": "Test",
    "age": 30,
    "phone": "1234567890",
    "email": "test@test.com",
    "image_base64": b64
}
try:
    res = requests.post("http://localhost:8000/auth/register/face", json=data)
    print("Status:", res.status_code)
    print("Response:", res.text)
except Exception as e:
    print("Error:", e)
