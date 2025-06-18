from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User
from auth import get_password_hash, verify_password
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://username:password@localhost/ai_analytics_db"
)

def get_db_session():
    """Get database session"""
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def list_all_users():
    """List all users in the database"""
    db = get_db_session()
    
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        
        if not users:
            print("📭 No users found in the database")
            return
        
        print(f"👥 Found {len(users)} user(s):")
        print("-" * 80)
        
        for i, user in enumerate(users, 1):
            status = "✅ Active" if user.is_active else "❌ Inactive"
            created = user.created_at.strftime("%Y-%m-%d %H:%M:%S")
            
            print(f"{i}. {user.full_name}")
            print(f"   📧 Email: {user.email}")
            print(f"   🆔 ID: {user.id}")
            print(f"   📅 Created: {created}")
            print(f"   🔄 Status: {status}")
            print()
            
    except Exception as e:
        print(f"❌ Error listing users: {e}")
    finally:
        db.close()

def create_user(email: str, full_name: str, password: str, is_active: bool = True):
    """Create a new user"""
    db = get_db_session()
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email.lower()).first()
        if existing_user:
            print(f"❌ User with email {email} already exists")
            return False
        
        # Create new user
        import uuid
        new_user = User(
            id=str(uuid.uuid4()),
            email=email.lower().strip(),
            full_name=full_name.strip(),
            hashed_password=get_password_hash(password),
            is_active=is_active
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"✅ User created successfully:")
        print(f"   📧 Email: {new_user.email}")
        print(f"   👤 Name: {new_user.full_name}")
        print(f"   🆔 ID: {new_user.id}")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating user: {e}")
        return False
    finally:
        db.close()

def update_user_status(email: str, is_active: bool):
    """Update user active status"""
    db = get_db_session()
    
    try:
        user = db.query(User).filter(User.email == email.lower()).first()
        if not user:
            print(f"❌ User with email {email} not found")
            return False
        
        user.is_active = is_active
        db.commit()
        
        status = "activated" if is_active else "deactivated"
        print(f"✅ User {email} has been {status}")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating user status: {e}")
        return False
    finally:
        db.close()

def reset_user_password(email: str, new_password: str):
    """Reset user password"""
    db = get_db_session()
    
    try:
        user = db.query(User).filter(User.email == email.lower()).first()
        if not user:
            print(f"❌ User with email {email} not found")
            return False
        
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        
        print(f"✅ Password reset for {email}")
        print(f"🔑 New password: {new_password}")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error resetting password: {e}")
        return False
    finally:
        db.close()

def delete_user(email: str):
    """Delete a user (use with caution!)"""
    db = get_db_session()
    
    try:
        user = db.query(User).filter(User.email == email.lower()).first()
        if not user:
            print(f"❌ User with email {email} not found")
            return False
        
        # Confirm deletion
        confirm = input(f"⚠️  Are you sure you want to delete user {email}? (yes/no): ")
        if confirm.lower() not in ['yes', 'y']:
            print("🚫 Deletion cancelled")
            return False
        
        db.delete(user)
        db.commit()
        
        print(f"✅ User {email} has been deleted")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting user: {e}")
        return False
    finally:
        db.close()

def main():
    """Main CLI for user management"""
    print("=" * 60)
    print("👥 AI Analytics Platform - User Management")
    print("=" * 60)
    
    while True:
        print("\nOptions:")
        print("1. List all users")
        print("2. Create new user")
        print("3. Update user status")
        print("4. Reset user password")
        print("5. Delete user")
        print("6. Exit")
        
        choice = input("\nSelect an option (1-6): ").strip()
        
        if choice == '1':
            list_all_users()
            
        elif choice == '2':
            print("\n📝 Create New User")
            email = input("Email: ").strip()
            full_name = input("Full Name: ").strip()
            password = input("Password: ").strip()
            
            if email and full_name and password:
                create_user(email, full_name, password)
            else:
                print("❌ All fields are required")
                
        elif choice == '3':
            print("\n🔄 Update User Status")
            email = input("Email: ").strip()
            status = input("Activate user? (y/n): ").strip().lower()
            
            if email and status in ['y', 'n']:
                is_active = status == 'y'
                update_user_status(email, is_active)
            else:
                print("❌ Invalid input")
                
        elif choice == '4':
            print("\n🔑 Reset User Password")
            email = input("Email: ").strip()
            new_password = input("New Password: ").strip()
            
            if email and new_password:
                reset_user_password(email, new_password)
            else:
                print("❌ Email and password are required")
                
        elif choice == '5':
            print("\n🗑️  Delete User")
            email = input("Email: ").strip()
            
            if email:
                delete_user(email)
            else:
                print("❌ Email is required")
                
        elif choice == '6':
            print("👋 Goodbye!")
            break
            
        else:
            print("❌ Invalid option. Please select 1-6.")

if __name__ == "__main__":
    main()