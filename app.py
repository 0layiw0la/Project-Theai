from flask import Flask, render_template, request, redirect, url_for
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

uploaded_files = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    global uploaded_files
    if request.method == 'POST':
        # Handle existing files
        existing_files = request.form.getlist('existing_files')
        uploaded_files = existing_files  # Reset to only include existing files

        # Handle newly uploaded files
        for file in request.files.getlist('images'):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            uploaded_files.append(f"/{filepath.replace(os.sep, '/')}")

        return redirect(url_for('upload_file'))
    return render_template('home.html', uploaded_files=uploaded_files)

@app.route('/camera')
def camera():
    return render_template('camera.html')

@app.route('/save-temp-image', methods=['POST'])
def save_temp_image():
    global uploaded_files
    file = request.files['image']
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    uploaded_files.append(f"/{filepath.replace(os.sep, '/')}")
    return '', 200

if __name__ == '__main__':
    app.run(debug=True)