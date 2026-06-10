"""
Test Supabase Connection
This script verifies that your application can successfully connect to Supabase
and lists all tables in the database.
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from sqlalchemy import create_engine, inspect, text

def test_supabase_connection():
    """Test the connection to Supabase PostgreSQL"""
    print("🔍 Testing Supabase Connection...\n")
    
    try:
        # Create engine
        print(f"📍 Database URL: {settings.DATABASE_URL}")
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        
        # Test connection
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("✅ Connection to Supabase PostgreSQL: SUCCESS!\n")
        
        # List tables
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print(f"📊 Tables found in database ({len(tables)} total):")
        for table in sorted(tables):
            print(f"   ✓ {table}")
        
        # Show table schemas
        print("\n📋 Table Schemas:\n")
        for table in sorted(tables):
            columns = inspector.get_columns(table)
            print(f"Table: {table}")
            for col in columns:
                print(f"  - {col['name']}: {col['type']}")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Connection Failed: {type(e).__name__}")
        print(f"   Error: {str(e)}\n")
        print("💡 Troubleshooting Tips:")
        print("   1. Check your DATABASE_URL in config.py is correct")
        print("   2. Verify Supabase password is correct (no spaces!)")
        print("   3. Check if Supabase project is running")
        print("   4. Ensure tables were created in Supabase dashboard")
        return False

if __name__ == "__main__":
    success = test_supabase_connection()
    sys.exit(0 if success else 1)
