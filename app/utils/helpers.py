"""
Helper Utilities Module
This module contains small utility functions used throughout the application.
"""

def format_error(e: Exception) -> dict:
    """
    Convert an exception to a formatted error dictionary.
    Used for returning error responses in API endpoints.
    
    Args:
        e: An exception object
        
    Returns:
        A dictionary with an "error" key containing the error message
        Example: {"error": "Division by zero"}
    """
    return {"error": str(e)}

