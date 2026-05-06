"""
Logging Module
This module sets up centralized logging for the entire application.
Provides a configured logger instance that outputs to console with timestamp and log level.
"""

import logging

# Configure logging with standard format including timestamp, logger name, level, and message
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# Create a root logger for the module
logger = logging.getLogger(__name__)

def get_logger(name: str):
    """
    Get a logger instance with the specified name.
    Use this to create loggers for different modules in the application.
    
    Args:
        name: The name of the logger (usually __name__ from the calling module)
        
    Returns:
        A Python logger instance configured with the app's logging settings
    """
    return logging.getLogger(name)

