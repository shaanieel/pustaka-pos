"""
R2 Uploader
===========
Cloudflare R2 upload service with retry logic.
Uses S3-compatible API via boto3.

Author: Zaein (Shino)
"""

import boto3
import logging
import time
import os
from botocore.config import Config
from typing import Dict

logger = logging.getLogger("image-service.r2_uploader")


class R2Uploader:
    """
    Upload files to Cloudflare R2 (S3-compatible storage).
    
    Features:
    - Retry logic (configurable max retries)
    - Exponential backoff between retries
    - Public URL generation
    - Content-type detection
    """
    
    def __init__(self, config: Dict):
        """
        Initialize R2 client.
        
        Args:
            config: Dict with keys:
                - account_id: Cloudflare account ID
                - access_key_id: R2 access key
                - secret_access_key: R2 secret key
                - bucket: R2 bucket name
                - endpoint: R2 S3-compatible endpoint
                - public_base: Public URL base
        """
        self.bucket = config["bucket"]
        self.public_base = config["public_base"]
        
        self.s3 = boto3.client(
            "s3",
            endpoint_url=config["endpoint"],
            aws_access_key_id=config["access_key_id"],
            aws_secret_access_key=config["secret_access_key"],
            region_name="auto",
            config=Config(
                retries={"max_attempts": 3, "mode": "standard"},
                connect_timeout=10,
                read_timeout=30,
            ),
        )
        logger.info(f"R2Uploader initialized — bucket: {self.bucket}")
    
    def upload_with_retry(self, file_path: str, key: str, max_retries: int = 3) -> str:
        """
        Upload file to R2 with retry on failure.
        
        Uses exponential backoff: 1s, 2s, 4s between retries.
        
        Args:
            file_path: Local file path to upload
            key: R2 object key (e.g. "covers/abc123.webp")
            max_retries: Maximum upload attempts (default 3)
            
        Returns:
            Public URL of uploaded file
            
        Raises:
            Exception if all retries fail
        """
        last_error = None
        
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"R2 upload attempt {attempt}/{max_retries}: {key}")
                
                self.s3.upload_file(
                    file_path,
                    self.bucket,
                    key,
                    ExtraArgs={
                        "ContentType": "image/webp",
                        "CacheControl": "public, max-age=31536000, immutable",
                    },
                )
                
                # Construct public URL
                url = f"{self.public_base}/{key}"
                logger.info(f"R2 upload success: {url}")
                return url
                
            except Exception as e:
                last_error = e
                logger.warning(f"R2 upload attempt {attempt} failed: {e}")
                if attempt < max_retries:
                    wait = 2 ** (attempt - 1)  # 1s, 2s, 4s
                    logger.info(f"Retrying in {wait}s...")
                    time.sleep(wait)
        
        raise Exception(f"R2 upload failed after {max_retries} attempts: {last_error}")
    
    def delete(self, key: str) -> bool:
        """
        Delete file from R2 (used for rollback on error).
        
        Args:
            key: R2 object key to delete
            
        Returns:
            True on success, False on failure
        """
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"R2 deleted: {key}")
            return True
        except Exception as e:
            logger.error(f"R2 delete failed: {e}")
            return False
