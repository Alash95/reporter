import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_signup_and_login():
    """Test user signup and login flow"""
    print("🧪 Testing User Authentication Flow")
    print("=" * 50)
    
    # Test data
    test_user = {
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "testpass123"
    }
    
    # Test Signup
    print("1. Testing Signup...")
    try:
        signup_response = requests.post(
            f"{BASE_URL}/auth/signup",
            json=test_user,
            headers={"Content-Type": "application/json"}
        )
        
        if signup_response.status_code == 200:
            signup_data = signup_response.json()
            print("✅ Signup successful!")
            print(f"   User: {signup_data['user']['full_name']}")
            print(f"   Email: {signup_data['user']['email']}")
            token = signup_data['access_token']
        else:
            print(f"❌ Signup failed: {signup_response.status_code}")
            print(f"   Error: {signup_response.text}")
            return
            
    except Exception as e:
        print(f"❌ Signup error: {e}")
        return
    
    # Test Login
    print("\n2. Testing Login...")
    try:
        login_response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"]
            },
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            print("✅ Login successful!")
            print(f"   User: {login_data['user']['full_name']}")
            token = login_data['access_token']
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"   Error: {login_response.text}")
            return
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Test Protected Route
    print("\n3. Testing Protected Route...")
    try:
        me_response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if me_response.status_code == 200:
            user_data = me_response.json()
            print("✅ Protected route access successful!")
            print(f"   User ID: {user_data['id']}")
            print(f"   Email: {user_data['email']}")
        else:
            print(f"❌ Protected route failed: {me_response.status_code}")
            
    except Exception as e:
        print(f"❌ Protected route error: {e}")
    
    print("\n🎉 Authentication test completed!")

if __name__ == "__main__":
    test_signup_and_login()