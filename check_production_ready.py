"""
Quick Production Deployment Status Check
Verify all components are ready for production
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings

def check_deployment_readiness():
    print("=" * 60)
    print("🚀 PRODUCTION DEPLOYMENT READINESS CHECK")
    print("=" * 60)
    
    checks = {
        "Database Connection": False,
        "Environment Variables": False,
        "psycopg2 Driver": False,
        "Requirements File": False,
        ".gitignore Protection": False,
        "No Hardcoded Secrets": False,
    }
    
    print("\n📋 Checking components...\n")
    
    # 1. Database Connection
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["Database Connection"] = True
        print("✅ Database Connection: READY (Connected to Supabase)")
    except Exception as e:
        print(f"❌ Database Connection: FAILED ({str(e)[:50]}...)")
    
    # 2. Environment Variables
    try:
        assert settings.DATABASE_URL, "DATABASE_URL not set"
        assert "supabase" in settings.DATABASE_URL.lower(), "Not using Supabase"
        checks["Environment Variables"] = True
        print("✅ Environment Variables: READY (Supabase configured)")
    except Exception as e:
        print(f"❌ Environment Variables: FAILED ({str(e)})")
    
    # 3. psycopg2 Driver
    try:
        import psycopg2
        checks["psycopg2 Driver"] = True
        print("✅ psycopg2 Driver: INSTALLED")
    except ImportError:
        print("❌ psycopg2 Driver: NOT INSTALLED - Run: pip install psycopg2-binary")
    
    # 4. Requirements File
    req_file = Path(__file__).parent / "requirements.txt"
    if req_file.exists():
        with open(req_file) as f:
            content = f.read()
            if "psycopg2" in content:
                checks["Requirements File"] = True
                print("✅ Requirements File: psycopg2-binary listed")
            else:
                print("❌ Requirements File: psycopg2-binary NOT listed")
    
    # 5. .gitignore Protection
    gitignore_file = Path(__file__).parent / ".gitignore"
    if gitignore_file.exists():
        with open(gitignore_file) as f:
            content = f.read()
            if ".env" in content:
                checks[".gitignore Protection"] = True
                print("✅ .gitignore Protection: .env is protected")
            else:
                print("❌ .gitignore Protection: .env NOT protected")
    
    # 6. No Hardcoded Secrets (basic check)
    try:
        app_dir = Path(__file__).parent / "app"
        sensitive_patterns = ["password=", "api_key=", "DATABASE_URL="]
        found_secrets = []
        
        for py_file in app_dir.rglob("*.py"):
            with open(py_file) as f:
                content = f.read()
                for pattern in sensitive_patterns:
                    if pattern in content and "str =" not in content:  # Ignore type hints
                        # Filter out comments and docstrings
                        lines = content.split("\n")
                        for line_num, line in enumerate(lines):
                            if pattern in line and not line.strip().startswith("#"):
                                if "settings." not in line:  # Allow settings references
                                    found_secrets.append(f"{py_file.name}:{line_num}")
        
        if not found_secrets:
            checks["No Hardcoded Secrets"] = True
            print("✅ No Hardcoded Secrets: Code is clean")
        else:
            print(f"⚠️  No Hardcoded Secrets: Found in {len(found_secrets)} locations")
            for loc in found_secrets[:3]:
                print(f"    - {loc}")
    except Exception as e:
        print(f"⚠️  No Hardcoded Secrets: Check skipped ({str(e)[:30]}...)")
    
    # Summary
    print("\n" + "=" * 60)
    total = sum(checks.values())
    total_checks = len(checks)
    
    print(f"📊 SCORE: {total}/{total_checks} ✓\n")
    
    if total == total_checks:
        print("🎉 ALL CHECKS PASSED! Ready for production deployment.\n")
        print("📋 Next Steps:")
        print("   1. Revoke exposed API keys from their dashboards")
        print("   2. Generate new API keys")
        print("   3. Add environment variables to production server")
        print("   4. Deploy to production")
        print("   5. Monitor database logs for errors\n")
        return True
    else:
        print("⚠️  SOME CHECKS FAILED. Fix issues above before deploying.\n")
        return False

if __name__ == "__main__":
    success = check_deployment_readiness()
    sys.exit(0 if success else 1)
