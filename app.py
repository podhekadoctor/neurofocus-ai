# app.py
import os
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Configure the Gemini API
try:
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-1.5-flash')
    print("Gemini API configured successfully.")
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    model = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if not model:
        return jsonify({"error": "AI model not configured. Check API key."}), 500

    data = request.json
    
    # --- FINAL PROMPT FOR A CLEAR, DIRECT, AND SAFE CONCLUSION ---
    prompt = f"""
    You are an analytical assistant for the "ADHD Insight" hackathon project.

    **YOUR MOST IMPORTANT RULE: YOU MUST NOT DIAGNOSE THE USER. NEVER USE THE PHRASES "YOU HAVE ADHD" or "YOU DO NOT HAVE ADHD".**

    Your task is to analyze the user's test results and classify them into one of three 'Pattern Correlation' levels. You must present the results in two parts: a Markdown table and a final conclusion.

    **User's Data:**
    - Questionnaire Score: {data['hyperactivityScore']} out of 24. (Score > 14 is an indicator).
    - Avg Reaction Time: {data['avgReactionTime']:.0f} ms. (Time > 400ms is an indicator).
    - Attention Test: {data['attentionMisses']} Misses, {data['attentionFalseClicks']} False Clicks. (Misses > 4 or False Clicks > 4 is an indicator).
    - Visual Memory Score: Reached level {data['memoryScore']}. (Score < 4 is an indicator).

    **OUTPUT INSTRUCTIONS:**

    **Part 1: The Table**
    First, create the exact same Markdown table as before with "Test Area", "Your Result", and "Brief Insight".

    **Part 2: The Final Conclusion**
    After the table, you must choose **ONE** of the three conclusion blocks below based on the number of indicators present in the user's data. Output the chosen block verbatim.

    ---
    **[Use this block if 0 or 1 indicator is present]**
    ### Final Conclusion

    **Result:** **Low Correlation**
    
    **Interpretation:** Your results do not show a significant pattern of traits commonly associated with ADHD. While everyone can have moments of distraction or impulsivity, your performance across these tests largely falls within a typical range.

    ---
    **[Use this block if 2 indicators are present]**
    ### Final Conclusion

    **Result:** **Moderate Correlation**

    **Interpretation:** Your results show a mixed pattern. While you performed within the typical range on some tests, a couple of areas showed traits that are sometimes associated with ADHD. This could suggest a specific area of challenge, such as impulsivity or inattention, rather than a broad pattern.

    ---
    **[Use this block if 3 or 4 indicators are present]**
    ### Final Conclusion

    **Result:** **Strong Correlation**

    **Interpretation:** Your results show a strong correlation with patterns of traits commonly seen in individuals with ADHD, particularly in the areas of inattention, impulsivity, or memory. This is a significant finding, and **it is strongly recommended that you share and discuss these results with a doctor or mental health professional.** They can provide a proper evaluation and guidance.
    
    ---

    Now, generate the complete response (table and one conclusion block) for the user's data.
    """

    try:
        response = model.generate_content(prompt)
        ai_analysis = response.text
        
        return jsonify({"analysis": ai_analysis})

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return jsonify({"error": "Failed to get analysis from AI model."}), 500

if __name__ == '__main__':
    app.run(debug=True)
