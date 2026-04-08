import google.generativeai as genai
from app.config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KeyManager:
    """
    Manages multiple Gemini API keys and handles rotation on failure.
    """
    def __init__(self):
        self.keys = settings.gemini_keys
        self.current_index = 0
        self.active_model = None
        self._initialize_model()

    def _initialize_model(self):
        """Initializes the Gemini model with the current key."""
        if not self.keys:
            logger.warning("No Gemini API keys found in configuration.")
            return

        current_key = self.keys[self.current_index]
        try:
            genai.configure(api_key=current_key)
            self.active_model = genai.GenerativeModel("models/gemini-flash-latest")
            logger.info(f"Initialized Gemini model with key index {self.current_index}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini with key {self.current_index}: {e}")
            self.rotate_key()

    def rotate_key(self) -> bool:
        """
        Moves to the next key and re-initializes the model.
        Returns True if a new key was successfully switched to.
        Returns False if all keys have been tried.
        """
        if not self.keys or len(self.keys) <= 1:
            logger.error("No additional Gemini keys available for rotation.")
            return False

        self.current_index = (self.current_index + 1) % len(self.keys)
        logger.info(f"Rotating to Gemini API key index {self.current_index}")
        self._initialize_model()
        return True

    def get_model(self):
        """Returns the current active model."""
        if not self.active_model:
            self._initialize_model()
        return self.active_model

# Singleton instance
gemini_manager = KeyManager()
