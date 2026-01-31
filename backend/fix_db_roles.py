import sqlite3
import os

db_path = 'reviflow.db'
if not os.path.exists(db_path):
    print(f"Database {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check current values
cursor.execute("SELECT DISTINCT role FROM users")
roles = cursor.fetchall()
print(f"Current roles in DB: {roles}")

# Update to uppercase to match Enum member names if that's what's causing the lookup error
cursor.execute("UPDATE users SET role = 'PARENT' WHERE role = 'parent'")
print(f"Updated {cursor.rowcount} 'parent' rows to 'PARENT'")

cursor.execute("UPDATE users SET role = 'LEARNER' WHERE role = 'learner'")
print(f"Updated {cursor.rowcount} 'learner' rows to 'LEARNER'")

conn.commit()
conn.close()
print("Database update complete")
