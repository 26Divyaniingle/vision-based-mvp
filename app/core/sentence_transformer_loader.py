"""
Shared loader for SentenceTransformer models.

The Hugging Face hub can raise transient client-lifecycle errors while probing
optional config files. If the model is already cached, falling back to local
files lets startup proceed without making those extra network requests.
"""

from threading import Lock

from sentence_transformers import SentenceTransformer

DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

_models = {}
_model_lock = Lock()


def get_sentence_transformer(model_name: str = DEFAULT_EMBEDDING_MODEL) -> SentenceTransformer:
    """Return a cached SentenceTransformer instance."""
    with _model_lock:
        if model_name in _models:
            return _models[model_name]

        try:
            model = SentenceTransformer(model_name, local_files_only=True)
        except Exception:
            model = SentenceTransformer(model_name)

        _models[model_name] = model
        return model
