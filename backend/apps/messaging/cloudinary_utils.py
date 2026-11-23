"""
Cloudinary file upload utility.
"""
import cloudinary
import cloudinary.uploader
import os

cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)


def upload_file(file, folder='messages'):
    """Upload a file to Cloudinary and return the secure URL."""
    if not file:
        return None
    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type='auto'
    )
    return result.get('secure_url')
