import io
from tests.conftest import auth_headers


def test_upload_profile_image_success(client, admin_user):
    headers = auth_headers(client, "admin@test.com", "Admin@12345")
    
    # Fake PNG content
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {
        "file": ("avatar.png", io.BytesIO(fake_png), "image/png")
    }

    response = client.post("/api/v1/auth/me/profile-image", headers=headers, files=files)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["profile_image"] is not None
    assert body["data"]["profile_image"].startswith("/uploads/profile_images/")

    profile_img_url = body["data"]["profile_image"]
    static_res = client.get(profile_img_url)
    assert static_res.status_code == 200
    assert static_res.content == fake_png


def test_upload_profile_image_invalid_type(client, admin_user):
    headers = auth_headers(client, "admin@test.com", "Admin@12345")
    files = {
        "file": ("document.txt", io.BytesIO(b"Hello world"), "text/plain")
    }

    response = client.post("/api/v1/auth/me/profile-image", headers=headers, files=files)
    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert "Invalid file type" in body["message"]


def test_upload_profile_image_over_size_limit(client, admin_user):
    headers = auth_headers(client, "admin@test.com", "Admin@12345")
    # 6 MB file
    large_data = b"0" * (6 * 1024 * 1024)
    files = {
        "file": ("large_photo.jpg", io.BytesIO(large_data), "image/jpeg")
    }

    response = client.post("/api/v1/auth/me/profile-image", headers=headers, files=files)
    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert "File size too large" in body["message"]


def test_delete_profile_image(client, admin_user):
    headers = auth_headers(client, "admin@test.com", "Admin@12345")
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    files = {"file": ("avatar.png", io.BytesIO(fake_png), "image/png")}

    # First upload
    upload_res = client.post("/api/v1/auth/me/profile-image", headers=headers, files=files)
    assert upload_res.status_code == 200
    image_url = upload_res.json()["data"]["profile_image"]
    assert image_url is not None

    # Then delete
    del_res = client.delete("/api/v1/auth/me/profile-image", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["data"]["profile_image"] is None

    # Static URL should now fail (404)
    static_res = client.get(image_url)
    assert static_res.status_code == 404
