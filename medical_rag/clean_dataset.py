import pandas as pd
import os

def clean_data():
    """
    Cleans the medicine dataset by merging use and side effect columns, 
    dropping missing names and empty uses.
    """
    # Define paths relative to the project root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_path = os.path.join(base_dir, "data", "raw", "all_medicine databased.csv")
    output_dir = os.path.join(base_dir, "data", "processed")
    output_path = os.path.join(output_dir, "clean_medicine_data.csv")

    print(f"Loading data from {input_path}...")
    try:
        # Load dataset
        df = pd.read_csv(input_path)
    except FileNotFoundError:
        print(f"Error: Could not find file at {input_path}")
        return

    print("Cleaning dataset...")
    # 1. Remove rows with missing medicine name
    if 'name' in df.columns:
        df = df.dropna(subset=['name'])
    else:
        print("Warning: 'name' column not found.")

    # 2. Merge all columns starting with 'use' into 'uses'
    use_cols = [col for col in df.columns if str(col).startswith('use')]
    if use_cols:
        df['uses'] = df[use_cols].apply(lambda x: ', '.join(x.dropna().astype(str)), axis=1)
    else:
        df['uses'] = ''

    # 3. Merge all columns starting with 'sideEffect' into 'side_effects'
    side_effect_cols = [col for col in df.columns if str(col).startswith('sideEffect')]
    if side_effect_cols:
        df['side_effects'] = df[side_effect_cols].apply(lambda x: ', '.join(x.dropna().astype(str)), axis=1)
    else:
        df['side_effects'] = ''

    # 4. Keep required fields if they exist
    required_cols = ['name', 'uses', 'side_effects', 'Chemical Class', 'Habit Forming', 'Action Class']
    existing_cols = [col for col in required_cols if col in df.columns]
    df = df[existing_cols]

    # 5. Remove rows with empty uses
    if 'uses' in df.columns:
        df = df[df['uses'].str.strip() != '']

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    print(f"Saving cleaned data to {output_path}...")
    df.to_csv(output_path, index=False)
    print(f"Data cleaned successfully. Final shape: {df.shape}")

if __name__ == "__main__":
    clean_data()
