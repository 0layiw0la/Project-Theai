import os
import json

def setup_google_auth():
    """Setup Google Cloud authentication"""
    try:
        # Set environment variable for service account
        credentials_path = os.path.join(os.path.dirname(__file__), 'AI_agent', 'project-theia-461422-56126386ff4c.json')
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
        
        # Verify credentials file exists
        if os.path.exists(credentials_path):
            with open(credentials_path, 'r') as f:
                creds = json.load(f)
                print(f"✅ Google Cloud credentials loaded for project: {creds.get('project_id')}")
                return True
        else:
            print("❌ Credentials file not found")
            return False
            
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        return False

if __name__ == "__main__":
    setup_google_auth()