import os
import json
import time
import statistics
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load API Key
load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Configure Gemini 2.5 Flash
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("❌ WARNING: GEMINI_API_KEY not found in .env")

genai.configure(api_key=GEMINI_API_KEY)
# Using the specific model we verified exists
model = genai.GenerativeModel('gemini-2.5-flash')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze_audio', methods=['POST'])
def analyze_audio():
    if 'audio_data' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    file = request.files['audio_data']
    filename = secure_filename(f"user_recording_{int(time.time())}.wav")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    print("Analyzing audio pattern...")
    
    try:
        audio_file = genai.upload_file(path=filepath)
        
        prompt = """
        Analyze this audio for ADHD markers:
        1. Tangentiality (wandering off-topic).
        2. Speed/Pacing (too fast or cluttering).
        3. Fillers (excessive 'um', 'ah').
        
        Return a concise summary (max 2 sentences) of the speech pattern observations.
        """
        
        result = model.generate_content([prompt, audio_file])
        analysis_text = result.text
        
        # Cleanup
        audio_file.delete()
        os.remove(filepath)
        
        return jsonify({"analysis": analysis_text})
        
    except Exception as e:
        print(f"Error in audio analysis: {e}")
        return jsonify({"analysis": "Audio analysis failed due to server error."}), 500

@app.route('/final_report', methods=['POST'])
def final_report():
    data = request.json
    
    # 1. Process Data
    rt = data.get('reactionTimes', [])
    variability = statistics.stdev(rt) if len(rt) > 1 else 0
    memory_score = data.get('memoryScore', 0)
    stroop_score = data.get('stroopScore', 0)
    time_diff = abs(data.get('timeDiff', 0))
    speech_analysis = data.get('audioAnalysis', 'No speech data.')

    # 2. Prepare Scores for Chart (Frontend needs raw numbers)
    scores = {
        "variability": variability,
        "memory": memory_score,
        "stroop": stroop_score,
        "time_diff": time_diff
    }

    # 3. Generate Clinical Report
    prompt = f"""
    You are a strictly analytical algorithm. Generate a Cognitive Screening Analysis based on these 5 data points.
    
    **USER DATA:**
    1. Speech Pattern: "{speech_analysis}"
    2. Motor Variability: {variability:.2f} ms (Standard: <150ms. High variability = Attention Lapses).
    3. Working Memory: Level {memory_score} (Standard: >4. Low = Working Memory Deficit).
    4. Impulse Control: {stroop_score}% Accuracy (Standard: >80%. Low = Impulsivity).
    5. Time Blindness: {time_diff:.2f}s deviation (Standard: <2.0s. High = Dyschronometria).

    **STRICT WRITING RULES:**
    - **NO** headers like "Client Name" or "Date".
    - **NO** introduction. Start immediately with the "Executive Summary".
    - **NO** roleplay. Be direct, objective, and data-driven.
    - **MUST** quote the user's specific score in every bullet point analysis.
    
    **REPORT STRUCTURE:**
    
    ### Executive Summary
    [Synthesize the profile in 3 sentences. Does it align with ADHD traits (High variability, Low Memory, Time Blindness)?]
    
    ### Domain Analysis
    * **Attention Stability:** [State score. Analyze.]
    * **Working Memory:** [State Level. Analyze.]
    * **Impulse Control:** [State %. Analyze.]
    * **Time Perception:** [State deviation. Analyze.]
    * **Speech:** [Summarize findings.]

    ### Recommendation
    [If 2+ metrics are outside standard ranges, strongly recommend professional evaluation. If mostly normal, provide reassurance.]
    """
    
    try:
        response = model.generate_content(prompt)
        return jsonify({
            "markdown_report": response.text,
            "scores": scores
        })
    except Exception as e:
        print(f"Error generating report: {e}")
        return jsonify({"error": "Report generation failed"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
