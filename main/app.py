from flask import Flask, render_template, request, jsonify
import json
import os
from threading import Thread
import time
from datetime import datetime

app = Flask(__name__)

# File paths for persistent storage
STAFF_DATA_FILE = "staff_data.json"
CLOCK_HISTORY_FILE = "clock_history.json"
CREDENTIALS_FILE = "credentials.json"  # New file for admin credentials

# Load data from files
def load_data(file_path, default={}):
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            return json.load(f)
    return default

# Save data to files
def save_data(file_path, data):
    with open(file_path, "w") as f:
        json.dump(data, f, indent=4)

# Initialize credentials if not present
def init_credentials():
    default_creds = {"username": "Admin", "password": "Passcode"}
    if not os.path.exists(CREDENTIALS_FILE):
        save_data(CREDENTIALS_FILE, default_creds)
    return load_data(CREDENTIALS_FILE, default_creds)

# Global variable to store latest NFC status
latest_nfc_status = {"status": "Waiting for NFC...", "message": ""}

# Simulate NFC reading
def simulate_nfc():
    nfc_serials = ["NFC123", "NFC456", "NFC789"]
    while True:
        serial = nfc_serials[int(time.time() % 3)]
        result = handle_nfc_tap(serial)
        global latest_nfc_status
        latest_nfc_status = result
        time.sleep(5)

# Handle NFC tap
def handle_nfc_tap(serial):
    staff_data = load_data(STAFF_DATA_FILE)
    clock_history = load_data(CLOCK_HISTORY_FILE)
    
    for staff_id, info in staff_data.items():
        if info["nfc"] == serial:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if staff_id not in clock_history:
                clock_history[staff_id] = []
            
            last_entry = clock_history[staff_id][-1] if clock_history[staff_id] else None
            if last_entry and not last_entry.get("clockOut"):
                last_entry["clockOut"] = now
                message = f"{info['name']} clocked out at {now}"
            else:
                clock_history[staff_id].append({"clockIn": now, "clockOut": None})
                message = f"{info['name']} clocked in at {now}"
            
            save_data(CLOCK_HISTORY_FILE, clock_history)
            return {"status": f"Detected NFC: {serial}", "message": message}
    
    return {"status": f"Detected NFC: {serial}", "message": "Staff not found for this NFC card"}

# Routes for HTML pages
@app.route('/')
def index():
    return render_template('Index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

@app.route('/change-password')
def change_password_page():
    return render_template('change-password.html')

# API: Admin login
@app.route('/api/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    creds = init_credentials()
    if username == creds["username"] and password == creds["password"]:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Invalid credentials"})

# API: Add staff
@app.route('/api/add_staff', methods=['POST'])
def add_staff():
    data = request.json
    name = data.get("name")
    nfc = data.get("nfc")
    if name and nfc:
        staff_data = load_data(STAFF_DATA_FILE)
        staff_id = str(int(time.time() * 1000))
        staff_data[staff_id] = {"name": name, "nfc": nfc}
        save_data(STAFF_DATA_FILE, staff_data)
        return jsonify({"success": True, "message": "Staff added successfully"})
    return jsonify({"success": False, "message": "Please fill all fields"})

# API: Search history
@app.route('/api/search_history', methods=['POST'])
def search_history():
    data = request.json
    search = data.get("search", "").lower()
    staff_data = load_data(STAFF_DATA_FILE)
    clock_history = load_data(CLOCK_HISTORY_FILE)
    
    results = []
    for staff_id, info in staff_data.items():
        if search in info["name"].lower() or search in info["nfc"]:
            history = clock_history.get(staff_id, [])
            results.append({
                "name": info["name"],
                "nfc": info["nfc"],
                "history": [{"clockIn": entry["clockIn"], "clockOut": entry["clockOut"] or "Pending"} for entry in history]
            })
    return jsonify({"results": results})

# API: Change password
@app.route('/api/change_password', methods=['POST'])
def change_password():
    data = request.json
    current_password = data.get("currentPassword")
    new_password = data.get("newPassword")
    confirm_new_password = data.get("confirmNewPassword")
    creds = init_credentials()
    
    if current_password != creds["password"]:
        return jsonify({"success": False, "message": "Current password is incorrect"})
    if new_password != confirm_new_password:
        return jsonify({"success": False, "message": "New passwords do not match"})
    if not new_password:
        return jsonify({"success": False, "message": "New password cannot be empty"})
    
    creds["password"] = new_password
    save_data(CREDENTIALS_FILE, creds)
    return jsonify({"success": True, "message": "Password changed successfully"})

# API: Get NFC status
@app.route('/api/nfc_status', methods=['GET'])
def nfc_status():
    global latest_nfc_status
    return jsonify(latest_nfc_status)

# Start NFC simulation in background
if __name__ == "__main__":
    nfc_thread = Thread(target=simulate_nfc, daemon=True)
    nfc_thread.start()
    app.run(debug=True, host="0.0.0.0", port=5000)

    from flask import Flask, render_template, jsonify
import json
import os
from threading import Thread
import time
from datetime import datetime

app = Flask(__name__)

# File paths
STAFF_DATA_FILE = "staff_data.json"
CLOCK_HISTORY_FILE = "clock_history.json"

# Load/save data
def load_data(file_path, default={}):
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            return json.load(f)
    return default

def save_data(file_path, data):
    with open(file_path, "w") as f:
        json.dump(data, f, indent=4)

# NFC simulation
latest_nfc_status = {"status": "Waiting for NFC...", "message": ""}

def simulate_nfc():
    nfc_serials = ["NFC123", "NFC456", "NFC789"]
    while True:
        serial = nfc_serials[int(time.time() % 3)]
        result = handle_nfc_tap(serial)
        global latest_nfc_status
        latest_nfc_status = result
        time.sleep(5)

def handle_nfc_tap(serial):
    staff_data = load_data(STAFF_DATA_FILE)
    clock_history = load_data(CLOCK_HISTORY_FILE)
    
    for staff_id, info in staff_data.items():
        if info["nfc"] == serial:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if staff_id not in clock_history:
                clock_history[staff_id] = []
            
            last_entry = clock_history[staff_id][-1] if clock_history[staff_id] else None
            if last_entry and not last_entry.get("clockOut"):
                last_entry["clockOut"] = now
                message = f"{info['name']} clocked out at {now}"
            else:
                clock_history[staff_id].append({"clockIn": now, "clockOut": None})
                message = f"{info['name']} clocked in at {now}"
            
            save_data(CLOCK_HISTORY_FILE, clock_history)
            return {"status": f"Detected NFC: {serial}", "message": message}
    
    return {"status": f"Detected NFC: {serial}", "message": "Staff not found for this NFC card"}

@app.route('/')
def index():
    return render_template('Index.html')

@app.route('/api/nfc_status', methods=['GET'])
def nfc_status():
    global latest_nfc_status
    return jsonify(latest_nfc_status)

if __name__ == "__main__":
    nfc_thread = Thread(target=simulate_nfc, daemon=True)
    nfc_thread.start()
    app.run(debug=True, host="0.0.0.0", port=5000)

    # Add credentials management
CREDENTIALS_FILE = "credentials.json"

def init_credentials():
    default_creds = {"username": "Admin", "password": "Passcode"}
    if not os.path.exists(CREDENTIALS_FILE):
        save_data(CREDENTIALS_FILE, default_creds)
    return load_data(CREDENTIALS_FILE, default_creds)

@app.route('/admin')
def admin():
    return render_template('admin.html')

@app.route('/api/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    creds = init_credentials()
    if username == creds["username"] and password == creds["password"]:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Invalid credentials"})


@app.route('/api/add_staff', methods=['POST'])
def add_staff():
    data = request.json
    name = data.get("name")
    nfc = data.get("nfc")
    if name and nfc:
        staff_data = load_data(STAFF_DATA_FILE)
        staff_id = str(int(time.time() * 1000))
        staff_data[staff_id] = {"name": name, "nfc": nfc}
        save_data(STAFF_DATA_FILE, staff_data)
        return jsonify({"success": True, "message": "Staff added successfully"})
    return jsonify({"success": False, "message": "Please fill all fields"})

@app.route('/api/search_history', methods=['POST'])
def search_history():
    data = request.json
    search = data.get("search", "").lower()
    staff_data = load_data(STAFF_DATA_FILE)
    clock_history = load_data(CLOCK_HISTORY_FILE)
    
    results = []
    for staff_id, info in staff_data.items():
        if search in info["name"].lower() or search in info["nfc"]:
            history = clock_history.get(staff_id, [])
            results.append({
                "name": info["name"],
                "nfc": info["nfc"],
                "history": [{"clockIn": entry["clockIn"], "clockOut": entry["clockOut"] or "Pending"} for entry in history]
            })
    return jsonify({"results": results})

@app.route('/change-password')
def change_password_page():
    return render_template('change-password.html')

@app.route('/api/change_password', methods=['POST'])
def change_password():
    data = request.json
    current_password = data.get("currentPassword")
    new_password = data.get("newPassword")
    confirm_new_password = data.get("confirmNewPassword")
    creds = init_credentials()
    
    if current_password != creds["password"]:
        return jsonify({"success": False, "message": "Current password is incorrect"})
    if new_password != confirm_new_password:
        return jsonify({"success": False, "message": "New passwords do not match"})
    if not new_password:
        return jsonify({"success": False, "message": "New password cannot be empty"})
    
    creds["password"] = new_password
    save_data(CREDENTIALS_FILE, creds)
    return jsonify({"success": True, "message": "Password changed successfully"})