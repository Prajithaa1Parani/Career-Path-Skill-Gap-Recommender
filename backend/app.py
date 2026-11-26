from pypdf import PdfReader
from flask import Flask, jsonify, request
from flask_cors import CORS
from nlp_engine import analyze_profile

app = Flask(__name__)
CORS(app)

# Home API
@app.route("/")
def home():
    return jsonify({
        "message": "CareerLens Backend is running!"
    })

# Career analysis API
@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "") if isinstance(data, dict) else ""

    if not isinstance(text, str) or not text.strip():
        return jsonify({
            "error": "Please enter your skills"
        }), 400

    return jsonify(analyze_profile(text))

# Resume upload API
@app.route("/upload", methods=["POST"])
def upload_resume():

    file = request.files.get("resume")

    if not file or not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Upload a PDF resume"}), 400

    try:
        reader = PdfReader(file)

        text = " ".join(
            page.extract_text() or ""
            for page in reader.pages
        )

    except Exception:
        return jsonify({"error": "Unable to read PDF"}), 400

    if not text.strip():
        return jsonify({"error": "No text found in resume"}), 400

    return jsonify(analyze_profile(text))


if __name__ == "__main__":
    app.run(port=5000)