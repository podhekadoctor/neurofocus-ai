import os
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

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("❌ WARNING: GEMINI_API_KEY not found in .env")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash') 

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze_audio', methods=['POST'])
def analyze_audio():
    if 'audio_data' not in request.files:
        return jsonify({"analysis": "No audio provided. Speech analysis skipped."}), 200
    
    file = request.files['audio_data']
    filename = secure_filename(f"user_recording_{int(time.time())}.wav")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    print("Analyzing audio pattern...")
    
    try:
        audio_file = genai.upload_file(path=filepath)
        
        # --- NEW HIGH-PRECISION PROMPT ---
        prompt = """
        You are a clinical assistant analyzing a patient's speech for ADHD markers.
        The user was asked: "How do you plan your day?"
        
        Analyze the audio for:
        1. **Tangentiality:** Did they stay on topic or wander into unrelated stories?
        2. **Pacing:** Is the speech rapid, cluttered, or full of long pauses?
        3. **Fillers:** Are there excessive "um", "ah", "like" (hesitancy)?

        OUTPUT:
        Provide a 2-sentence observation. Do NOT include an intro.
        Example: "Subject displayed rapid pacing with frequent topic changes, failing to answer the prompt directly. Excessive use of filler words suggests processing delay."
        """
        
        result = model.generate_content([prompt, audio_file])
        analysis_text = result.text
        
        # Cleanup
        audio_file.delete()
        os.remove(filepath)
        
        return jsonify({"analysis": analysis_text})
        
    except Exception as e:
        print(f"Error in audio analysis: {e}")
        return jsonify({"analysis": "Audio processing error. Pattern could not be determined."}), 200

@app.route('/final_report', methods=['POST'])
def final_report():
    data = request.json
    
    # 1. Process Data
    rt = data.get('reactionTimes', [])
    variability = statistics.stdev(rt) if len(rt) > 1 else 0
    memory_score = data.get('memoryScore', 0)
    stroop_score = data.get('stroopScore', 0)
    time_diff = data.get('timeDiff', 0) # Can be negative or positive
    speech_analysis = data.get('audioAnalysis', 'No speech data.')

    # 2. Prepare Scores for Chart
    scores = {
        "variability": variability,
        "memory": memory_score,
        "stroop": stroop_score,
        "time_diff": time_diff
    }

    # 3. Contextualize Logic (Prevent Hallucination)
    # We define the status HERE so the AI is forced to agree with the math.
    var_status = "High Variability (Attention Lapses)" if variability > 150 else "Stable"
    mem_status = "Below Average" if memory_score < 4 else "Intact"
    time_status = "Significant Dyschronometria" if abs(time_diff) > 2.0 else "Accurate"
    
    # --- NEW REPORT GENERATION PROMPT ---
    prompt = f"""
    Generate a serious Cognitive Screening Report based on these EXACT metrics.
    **CRITICAL:** Do NOT say "I cannot see the graph". Refer to the "Chart Above".
    There is a radar chart with 4 axes: Attention Stability, Working Memory, Impulse Control, Time Perception,so the user can see a chart on screen. 
    **PATIENT DATA:**
    1. **Speech Pattern:** "{speech_analysis}"
    2. **Attention Stability (Motor Test):** {variability:.2f}ms deviation. CLINICAL STATUS: {var_status}.
    3. **Working Memory:** Level {memory_score}. CLINICAL STATUS: {mem_status}.
    4. **Impulse Control (Stroop):** {stroop_score}% Accuracy.
    5. **Time Perception:** Deviation of {time_diff:.2f} seconds. CLINICAL STATUS: {time_status}.

    **WRITING INSTRUCTIONS:**
    - **Executive Summary:** Synthesize the 5 points. If {var_status} is "High" OR {time_status} is "Significant", mention that the profile shows executive function challenges.
    - **Visual Analysis:** Reference the user's chart. (e.g., "As shown in the graph, the 'Time Perception' axis shows a significant drop...")
    - **Speech:** Incorporate the speech analysis provided above. explain what it means.
    - **Conclusion:** If markers are off, recommend a professional evaluation. Use a supportive, objective tone.

    **FORMAT:**
    - Use Markdown.
    - NO introductory fluff ("Here is your report"). Start with "## Executive Summary".
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