from flask import Flask, send_from_directory
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from sqlalchemy.engine import URL
import os
import urllib
from models import db
from routes import routes
import pandas as pd
import urllib.parse


# Initialize Flask app
app = Flask(__name__, static_folder='Create')

# Serve static files from the 'Create' directory
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

# Load environment variables
load_dotenv()

# Create URL object with driver specification
connection_url = URL.create(
     "mssql+pyodbc",
     query={
         "odbc_connect": os.environ["SQLAZURECONNSTR_AZURE_SQL_CONNECTIONSTRING"],
         "driver": "ODBC Driver 18 for SQL Server"
     }
 )


# Configure Flask-SQLAlchemy
app.config['SQLALCHEMY_DATABASE_URI'] = str(connection_url)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Configure upload settings
ALLOWED_EXTENSIONS = {'csv'}
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDERS'] = UPLOAD_FOLDER

# Register blueprints
app.register_blueprint(routes)

if __name__ == "__main__":
    app.run(debug=True, use_reloader=True)