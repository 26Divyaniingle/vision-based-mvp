import faiss
import pickle
import os
import numpy as np
from sentence_transformers import SentenceTransformer

def build_disease_index():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    index_path = os.path.join(base_dir, "faiss", "disease_index.faiss")
    metadata_path = os.path.join(base_dir, "faiss", "disease_metadata.pkl")

    # Ensure the faiss directory exists
    os.makedirs(os.path.dirname(index_path), exist_ok=True)

    # Hardcoded disease knowledge base mapping diseases to symptoms
    diseases_data = [
        {
            "disease": "Common Cold",
            "symptoms": "cough, sore throat, runny nose, mild fever, sneezing, congestion"
        },
        {
            "disease": "Flu",
            "symptoms": "high fever, chills, body pain, headache, fatigue, dry cough"
        },
        {
            "disease": "COVID-19",
            "symptoms": "fever, dry cough, loss of taste, loss of smell, shortness of breath, fatigue"
        },
        {
            "disease": "Malaria",
            "symptoms": "high fever, shaking chills, profuse sweating, headache, nausea, vomiting"
        },
        {
            "disease": "Dengue",
            "symptoms": "high fever, severe headache, severe eye pain, joint pain, muscle / bone pain, rash, mild bleeding"
        },
        {
            "disease": "Typhoid",
            "symptoms": "prolonged high fever, weakness, stomach pain, headache, diarrhea or constipation, cough, loss of appetite"
        },
        {
            "disease": "Viral Fever",
            "symptoms": "fever, chills, headache, muscle ache, weakness, dehydration"
        },
        {
            "disease": "Allergic Rhinitis",
            "symptoms": "sneezing, runny nose, itchy nose, itchy eyes, watery eyes, nasal congestion"
        },
        {
            "disease": "Migraine",
            "symptoms": "severe throbbing pain, pulsing sensation, usually on one side of the head, nausea, vomiting, sensitivity to light and sound"
        },
        {
            "disease": "Gastroenteritis",
            "symptoms": "watery diarrhea, abdominal cramps, nausea, vomiting, occasional muscle aches, low-grade fever"
        }
    ]

    print("Loading embedding model (sentence-transformers/all-MiniLM-L6-v2)...")
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    # We embed the symptoms text so that we can match patient symptoms against it
    texts = [item['symptoms'] for item in diseases_data]
    print(f"Generating embeddings for {len(texts)} diseases...")
    embeddings = model.encode(texts, show_progress_bar=True)
    embeddings = np.array(embeddings).astype('float32')

    dimension = embeddings.shape[1]
    
    # Create FAISS Index (L2 distance or Inner Product)
    # Using L2 distance here
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    # Save the index
    print(f"Saving disease index to {index_path}...")
    faiss.write_index(index, index_path)

    # Save the metadata (mapping from index to disease info)
    print(f"Saving disease metadata to {metadata_path}...")
    with open(metadata_path, "wb") as f:
        pickle.dump(diseases_data, f)
    
    print("Disease index built successfully.")

if __name__ == "__main__":
    build_disease_index()
