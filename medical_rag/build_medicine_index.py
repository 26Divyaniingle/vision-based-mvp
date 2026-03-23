import pandas as pd
import faiss
import pickle
import numpy as np
import os
from sentence_transformers import SentenceTransformer

def build_medicine_index():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    processed_data_path = os.path.join(base_dir, "data", "processed", "clean_medicine_data.csv")
    index_path = os.path.join(base_dir, "faiss", "medicine_index.faiss")
    metadata_path = os.path.join(base_dir, "faiss", "medicine_metadata.pkl")

    print(f"Loading cleaned medicine data from {processed_data_path}...")
    try:
        df = pd.read_csv(processed_data_path)
    except FileNotFoundError:
        print(f"Error: Required file {processed_data_path} not found. Please run clean_dataset.py first.")
        return

    # Handle NaNs
    df.fillna('', inplace=True)
    
    # We create the text format as required
    print("Formatting text for embeddings...")
    def format_row(row):
        return f"Medicine: {row.get('name', '')}\nUses: {row.get('uses', '')}\nSide effects: {row.get('side_effects', '')}\nChemical class: {row.get('Chemical Class', '')}"
    
    df['text_for_embedding'] = df.apply(format_row, axis=1)

    # To be memory efficient, we can get list of dicts for metadata
    # We only keep essential information in metadata to save RAM and disk
    metadata_records = df[['name', 'uses', 'side_effects', 'Chemical Class']].to_dict('records')
    texts = df['text_for_embedding'].tolist()

    print("Loading embedding model (sentence-transformers/all-MiniLM-L6-v2)...")
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    dimension = 384  # Embedding dimension of all-MiniLM-L6-v2
    # Using FlatL2 for index building. 250k medicines can fit in memory.
    index = faiss.IndexFlatL2(dimension)
    
    print(f"Generating embeddings for {len(texts)} medicines in batches... This may take a while.")
    
    # Process in batches to prevent going Out-Of-Memory
    batch_size = 512
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        # Generate embeddings
        batch_embeddings = model.encode(batch_texts, show_progress_bar=False)
        batch_embeddings = np.array(batch_embeddings).astype('float32')
        
        # Add to FAISS index
        index.add(batch_embeddings)
        
        if (i + batch_size) % 10240 == 0 or (i + batch_size) >= len(texts):
            print(f"Processed {min(i + batch_size, len(texts))} / {len(texts)} medicines.")

    print(f"Saving medicine FAISS index to {index_path}...")
    faiss.write_index(index, index_path)

    print(f"Saving medicine metadata to {metadata_path}...")
    with open(metadata_path, 'wb') as f:
        pickle.dump(metadata_records, f)

    print("Medicine index and metadata successfully created.")

if __name__ == "__main__":
    build_medicine_index()
