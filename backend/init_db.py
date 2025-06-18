from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import Base, User
from auth import get_password_hash
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

# Database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL"
)


def init_database():
    """Initialize the database and create tables"""

    print("🚀 Initializing AI Analytics Database...")

    try:
        # Create engine
        engine = create_engine(DATABASE_URL)

        print("📊 Creating database tables...")
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")

        # Create session
        SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            print("👤 Setting up demo user...")

            # Check if demo user already exists
            demo_user = db.query(User).filter(
                User.email == "demo@example.com").first()

            if demo_user:
                print("ℹ️  Demo user already exists")
                # Update the demo user to ensure it has the correct password
                demo_user.hashed_password = get_password_hash("demo123")
                demo_user.is_active = True
                db.commit()
                print("🔄 Demo user password updated")
            else:
                # Create new demo user
                demo_user = User(
                    id=str(uuid.uuid4()),
                    email="demo@example.com",
                    full_name="Demo User",
                    hashed_password=get_password_hash("demo123"),
                    is_active=True
                )
                db.add(demo_user)
                db.commit()
                db.refresh(demo_user)
                print("✅ Demo user created successfully!")

            # Verify the demo user was created/updated
            verification_user = db.query(User).filter(
                User.email == "demo@example.com").first()
            if verification_user:
                print(f"✅ Demo user verified:")
                print(f"   📧 Email: {verification_user.email}")
                print(f"   👤 Name: {verification_user.full_name}")
                print(f"   🆔 ID: {verification_user.id}")
                print(f"   ✅ Active: {verification_user.is_active}")
            else:
                print("❌ Failed to verify demo user creation")

            print("\n🎉 Database initialization completed successfully!")
            print("\n📝 Demo Login Credentials:")
            print("   📧 Email: demo@example.com")
            print("   🔑 Password: demo123")
            print("\n🚀 You can now start the FastAPI server with:")
            print("   uvicorn main:app --reload")

        except Exception as e:
            print(f"❌ Error creating demo user: {e}")
            db.rollback()
            raise
        finally:
            db.close()

    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure PostgreSQL is running")
        print("   2. Check your DATABASE_URL in .env file")
        print("   3. Ensure the database exists")
        print("   4. Verify database credentials")
        raise


def create_additional_demo_data():
    """Create additional demo data for testing (optional)"""

    print("\n📊 Creating additional demo data...")

    try:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            # You can add additional demo data here if needed
            # For example: sample files, queries, dashboards, etc.

            print("✅ Additional demo data created successfully!")

        except Exception as e:
            print(f"⚠️  Warning: Could not create additional demo data: {e}")
            db.rollback()
        finally:
            db.close()

    except Exception as e:
        print(f"⚠️  Warning: Could not connect to database for demo data: {e}")


def verify_database_connection():
    """Verify database connection before initialization"""
    
    print("🔌 Verifying database connection...")
    
    try:
        engine = create_engine(DATABASE_URL)
        
        # Test connection
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))  # wrapped in text()
            if result.fetchone():
                print("✅ Database connection successful!")
                return True
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print(f"🔗 DATABASE_URL: {DATABASE_URL}")
        return False


def main():
    """Main initialization function"""

    print("=" * 60)
    print("🤖 AI Analytics Platform - Database Initialization")
    print("=" * 60)

    # Verify database connection first
    if not verify_database_connection():
        print("\n❌ Aborting initialization due to connection failure")
        print("\n🔧 Please check:")
        print("   1. PostgreSQL service is running")
        print("   2. Database exists and is accessible")
        print("   3. Credentials in .env file are correct")
        return

    # Initialize database
    try:
        init_database()

        # Optionally create additional demo data
        create_additional_demo_data()

        print("\n" + "=" * 60)
        print("🎉 INITIALIZATION COMPLETE!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ INITIALIZATION FAILED: {e}")
        print("\n🆘 Need help? Check the troubleshooting section above.")


if __name__ == "__main__":
    main()
