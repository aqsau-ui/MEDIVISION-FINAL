"""
Password Reset Utility for MEDIVISION Users
Allows you to reset passwords for existing users
"""
import mysql.connector
from passlib.hash import bcrypt
import sys

def reset_password(email: str, new_password: str):
    """Reset password for a user"""
    try:
        # Connect to database
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="aqsa",
            database="medivision_db"
        )
        cursor = conn.cursor(dictionary=True)
        
        # Check if user exists
        cursor.execute("SELECT id, full_name, email FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            print(f"❌ User with email '{email}' not found!")
            return False
        
        # Hash the new password
        hashed_password = bcrypt.hash(new_password)
        
        # Update password
        cursor.execute(
            "UPDATE users SET password = %s WHERE email = %s",
            (hashed_password, email)
        )
        conn.commit()
        
        print(f"✅ Password reset successful for {user['full_name']} ({email})")
        print(f"   New password: {new_password}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def list_users():
    """List all verified users"""
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="aqsa",
            database="medivision_db"
        )
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT email, full_name, is_verified FROM users ORDER BY id")
        users = cursor.fetchall()
        
        print("\n=== All Users ===")
        for user in users:
            status = "✅ Verified" if user['is_verified'] else "❌ Not Verified"
            print(f"  {user['email']:30} | {user['full_name']:20} | {status}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("MEDIVISION - Password Reset Utility")
    print("=" * 60)
    
    if len(sys.argv) == 1:
        # Interactive mode
        list_users()
        print("\n")
        email = input("Enter user email: ").strip()
        new_password = input("Enter new password: ").strip()
        
        if email and new_password:
            reset_password(email, new_password)
        else:
            print("❌ Email and password are required!")
    
    elif len(sys.argv) == 3:
        # Command line mode
        email = sys.argv[1]
        new_password = sys.argv[2]
        reset_password(email, new_password)
    
    elif sys.argv[1] == "list":
        list_users()
    
    else:
        print("Usage:")
        print("  Interactive: python reset_user_password.py")
        print("  Direct:      python reset_user_password.py <email> <password>")
        print("  List users:  python reset_user_password.py list")
