import uuid
import json
import os
from flask import Flask,request,jsonify, render_template
import pprint
import google.generativeai as palm
import random
from flask_cors import CORS
from gloabl_ver import questions
from dotenv import load_dotenv
import json
load_dotenv()

app = Flask (__name__)

CORS(app, origins='*')

api_key = os.getenv("BARD_API_KEY")
if not api_key:
    raise ValueError("OpenAI API key not found. Make sure it's set in the .env file.")

folder_path = "Flask_sessions"

defaults = {
  'model': 'models/text-bison-001',
  'temperature': 0.1,
  'candidate_count': 1,
  'top_k': 40,
  'top_p': 0.95,
  'max_output_tokens': 1024,
  'stop_sequences': [],
  'safety_settings': [{"category":"HARM_CATEGORY_DEROGATORY","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_TOXICITY","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_VIOLENCE","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_SEXUAL","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_MEDICAL","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_DANGEROUS","threshold":"BLOCK_NONE"}],
}


palm.configure(api_key=api_key)

file_path = 'stored_data.json'

QNA = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate_session', methods=['GET'])
def generate_session():
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
    session_id = str(uuid.uuid4())
    filename = f"{folder_path}/{session_id}.json"
    # Data to be written to the JSON file (null values)
    data = []
    # Write the data to the JSON file
    with open(filename, 'w') as json_file:
        json.dump(data, json_file, indent=4)

    return jsonify(session_id)

@app.route('/generate_questions/<session_id>', methods=["GET"])
def generate_questions(session_id):
    number_of_questions = 10
    ask_question = random.sample(questions,number_of_questions)
    return jsonify(ask_question)

@app.route("/store_qa/<session_id>", methods=["POST"])
def store_qa(session_id):
    
    try:
        if request.form:
            data = request.form.get
        else:
            # If not, assume JSON data
            data = request.get_json()
        # Check if the file exists
        if os.path.exists(f"{folder_path}/{session_id}.json"):
            # If the file exists, load existing data
            with open(f"{folder_path}/{session_id}.json", 'r') as file:
                existing_data = json.load(file)
            
            # Append the new data to the existing data
            existing_data.append(data)
        else:
            # If the file doesn't exist, create a new list with the incoming data
            response = {'status': 'error', 'message': 'Invalid session ID'}
            return jsonify(response)

        # Write the combined data back to the file
        with open(f"{folder_path}/{session_id}.json", 'w') as file:
            json.dump(existing_data, file)

        response = existing_data
    except Exception as e:
        response = {'status': 'error', 'message': str(e)}

    return jsonify(response)
    
@app.route("/predict",methods=["POST"])
def predict():
    try:
        if request.form:
            data = request.form.get
        else:
            # If not, assume JSON data
            data = request.get_json()

        prompt = "you are an expert mental health analyzer, you can analys the mental health Using the given data:",data,"the response should include {'sentiment':'neutral' or 'positive' or 'negative', 'reason': 'Predict the detailed reason for the sentiment.', 'things to do' : 'Predict detailed actions to be taken based on the sentiment.'.}"
        prompt = str(prompt)
        completion = palm.generate_text(
            **defaults, 
            prompt=prompt,
        )
        response = completion.result

        # Extract the JSON string from the input
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        json_string = response[json_start:json_end]

        # # Clean the JSON string
        json_string = json_string.replace('\\"', '"').replace("\n", "").replace("\\", "")
        final_response = eval(json_string)
        return jsonify(final_response)
    
    except Exception as e:
        return jsonify({"error": str(e)})
    
if __name__ == "__main__":
    app.run(debug=True,host="0.0.0.0",port=4000)