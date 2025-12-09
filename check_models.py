import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("Error: GEMINI_API_KEY not found in .env")
else:
    genai.configure(api_key=api_key)
    
    print("Fetching available models for your API key...\n")
    try:
        # This lists every model your key can access
        for m in genai.list_models():
            # We only care about models that can 'generateContent'
            if 'generateContent' in m.supported_generation_methods:
                print(f"Model Name: {m.name}")
                print(f" - Display Name: {m.display_name}")
                print(f" - Description: {m.description}")
                print("-" * 40)
    except Exception as e:
        print(f"Error fetching models: {e}")