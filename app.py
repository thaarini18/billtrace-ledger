import json
import os
import random
import secrets
from datetime import datetime, timedelta
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

LEDGER_FILE = Path(__file__).parent / "ledger.json"
USERS_FILE = Path(__file__).parent / "users.json"

issued_series_log = {
    "A1B2C3D4": "Verified",
    "X9Y8Z7W6": "Verified",
    "FLAG1234": "Verified",
    "M5N6O7P8": "Verified",
    "Q3R4S5T6": "Verified",
}

LOCATIONS = [
    {"lat": 40.7128, "lon": -74.0060, "name": "New York, NY"},
    {"lat": 34.0522, "lon": -118.2437, "name": "Los Angeles, CA"},
    {"lat": 41.8781, "lon": -87.6298, "name": "Chicago, IL"},
    {"lat": 29.7604, "lon": -95.3698, "name": "Houston, TX"},
    {"lat": 33.4484, "lon": -112.0740, "name": "Phoenix, AZ"},
]

DUMMY_SERIALS = ["A1B2C3D4", "X9Y8Z7W6", "FLAG1234", "M5N6O7P8", "FAKE9999", "UNK00001"]

def load_ledger() -> dict:

    if LEDGER_FILE.exists():
        try:
            data = json.loads(LEDGER_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict) and "all_scanned_bills" in data:
                return data["all_scanned_bills"]
        except (json.JSONDecodeError, KeyError):
            pass
    return {}


def save_ledger(all_scanned_bills: dict) -> None:
   
    payload = {"all_scanned_bills": all_scanned_bills}
    LEDGER_FILE.write_text(
        json.dumps(payload, indent=2, default=str), encoding="utf-8"
    )


all_scanned_bills: dict = load_ledger()

def load_users() -> dict:
    
    if USERS_FILE.exists():
        try:
            data = json.loads(USERS_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return data
        except (json.JSONDecodeError, KeyError):
            pass
    return {}


def save_users(users: dict) -> None:
   
    USERS_FILE.write_text(
        json.dumps(users, indent=2, default=str), encoding="utf-8"
    )


registered_users: dict = load_users()

def simulate_ocr(has_image: bool, manual_serial=None):
    
    if manual_serial and manual_serial.strip():
        return "".join(c for c in manual_serial.strip().upper() if c.isalnum())[:20]
    if has_image:
        return random.choice(DUMMY_SERIALS)
    return ""

def simulate_gps(location_index=None):
   
    if location_index is not None and 0 <= location_index < len(LOCATIONS):
        return LOCATIONS[location_index]
    return random.choice(LOCATIONS)

def check_bill(serial: str, current_timestamp: datetime, current_location: dict) -> dict:

    result = {
        "serial": serial,
        "timestamp": current_timestamp.isoformat(),
        "location": current_location,
        "status": "",
        "status_code": "",
        "message": "",
        "history": [],
        "clone_alert": False,
    }

    if serial not in issued_series_log:
        result["status"] = "INVALID"
        result["status_code"] = "red"
        result["message"] = (
            "Serial number series unrecognized. "
            "This note is NOT in the verified issuance database."
        )
       
        current_user = session.get("username", "unknown")
        scan_record = {
            "timestamp": current_timestamp.isoformat(),
            "location": current_location,
            "user": current_user,
        }
        all_scanned_bills.setdefault(serial, []).append(scan_record)
        save_ledger(all_scanned_bills)
        result["history"] = all_scanned_bills.get(serial, [])
        return result

    previous_scans = all_scanned_bills.get(serial, [])
    clone_detected = False

    if previous_scans:
        most_recent = previous_scans[-1]
        prev_time = datetime.fromisoformat(most_recent["timestamp"])
        prev_loc = most_recent["location"]

        time_delta = current_timestamp - prev_time
        location_differs = (
            current_location["lat"] != prev_loc["lat"]
            or current_location["lon"] != prev_loc["lon"]
        )

        if time_delta < timedelta(hours=1) and location_differs:
            clone_detected = True

    current_user = session.get("username", "unknown")
    scan_record = {
        "timestamp": current_timestamp.isoformat(),
        "location": current_location,
        "user": current_user,
    }
    all_scanned_bills.setdefault(serial, []).append(scan_record)
    save_ledger(all_scanned_bills)

    if clone_detected:
        result["status"] = "CLONE ALERT"
        result["status_code"] = "yellow"
        result["message"] = (
            "Potential Cloned Note Detected! "
            "Previously scanned within one hour at a different location. "
            "Exercise extreme caution."
        )
        result["clone_alert"] = True
    else:
        result["status"] = "VERIFIED"
        result["status_code"] = "green"
        if len(previous_scans) == 0:
            result["message"] = "Note verified. First scan recorded successfully."
        else:
            result["message"] = (
                "Note verified. Valid interval since last scan — no anomaly detected."
            )

    result["history"] = all_scanned_bills.get(serial, [])
    return result

@app.route("/")
def index():
    if "username" not in session:
        return redirect(url_for("login_page"))
    return render_template("index.html", username=session["username"])


@app.route("/login")
def login_page():
    if "username" in session:
        return redirect(url_for("index"))
    return render_template("login.html")


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters."}), 400

    if len(password) < 4:
        return jsonify({"error": "Password must be at least 4 characters."}), 400

    if username.lower() in {k.lower() for k in registered_users}:
        return jsonify({"error": "Username already taken."}), 409

    registered_users[username] = generate_password_hash(password, method="pbkdf2:sha256")
    save_users(registered_users)

    session["username"] = username
    return jsonify({"message": "Account created successfully!", "username": username})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    stored_hash = registered_users.get(username)
    if not stored_hash or not check_password_hash(stored_hash, password):
        return jsonify({"error": "Invalid username or password."}), 401

    session["username"] = username
    return jsonify({"message": "Login successful!", "username": username})


@app.route("/logout")
def logout():
    session.pop("username", None)
    return redirect(url_for("login_page"))


@app.route("/api/process", methods=["POST"])
def process_scan():
    has_image = "image" in request.files and request.files["image"].filename != ""
    manual_serial = request.form.get("serial", "").strip()
    location_index_str = request.form.get("location_index", "")

    location_index = None
    if location_index_str.isdigit():
        location_index = int(location_index_str)

    serial = simulate_ocr(has_image, manual_serial if manual_serial else None)

    if not serial:
        return jsonify({"error": "No serial number could be extracted. Please upload an image or enter a serial number manually."}), 400

    current_timestamp = datetime.now()
    current_location = simulate_gps(location_index)

    result = check_bill(serial, current_timestamp, current_location)

    return jsonify(result)


@app.route("/api/history", methods=["GET"])
def get_history():
    history = []
    for serial, scans in all_scanned_bills.items():
        for scan in scans:
            verified = serial in issued_series_log
            history.append({
                "serial": serial,
                "timestamp": scan["timestamp"],
                "location": scan["location"],
                "user": scan.get("user", "unknown"),
                "verified": verified,
            })
    history.sort(key=lambda x: x["timestamp"], reverse=True)
    return jsonify({"history": history, "total_scans": len(history)})


@app.route("/api/locations", methods=["GET"])
def get_locations():
    return jsonify({"locations": LOCATIONS})


@app.route("/api/reset", methods=["POST"])
def reset_ledger():
    global all_scanned_bills
    all_scanned_bills = {}
    save_ledger(all_scanned_bills)
    return jsonify({"message": "Ledger reset successfully."})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
