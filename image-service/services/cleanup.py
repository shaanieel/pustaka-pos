"""
Cleanup Service
===============
Handles temporary file cleanup after image processing.
Ensures no temp files are left behind, even on errors.

Author: Zaein (Shino)
"""

import os
import logging
from typing import List

logger = logging.getLogger("image-service.cleanup")


def cleanup_temp_files(file_paths: List[str]) -> int:
    """
    Delete temporary files from the filesystem.
    
    Safely handles missing files (already deleted) and permission errors.
    Logs each deletion for audit trail.
    
    Args:
        file_paths: List of file paths to delete
        
    Returns:
        Number of files successfully deleted
    """
    deleted = 0
    for path in file_paths:
        if not path:
            continue
        try:
            if os.path.exists(path):
                os.remove(path)
                logger.info(f"Deleted temp file: {path}")
                deleted += 1
        except PermissionError:
            logger.warning(f"Permission denied: {path}")
        except Exception as e:
            logger.warning(f"Failed to delete {path}: {e}")
    
    if deleted:
        logger.info(f"Cleanup complete: {deleted}/{len(file_paths)} files deleted")
    return deleted
