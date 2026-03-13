"""
BillTrace Ledger - Full-Stack Currency Note Authentication System
=================================================================
A Flask-based web application for shopkeepers to scan currency note
serial numbers, detect potential counterfeits (cloned notes), and
log trace data for forensic analysis.

Data Structures:
----------------
all_scanned_bills (dict):
    Key   = Serial Number (str)
    Value = List of scan records, each record is a dict:
        {
            "timestamp": ISO 8601 datetime string,
            "location": {"lat": float, "lon": float, "name": str},
            "user": str (shop identifier)
        }

issued_series_log (dict):
    Key   = Known valid serial number prefix/full number (str)
    Value = "Verified"

JSON Schema for ledger.json:
{
    "all_scanned_bills": {
        "<SERIAL_NUMBER>": [
            {
                "timestamp": "2026-03-13T10:30:00",
                "location": {"lat": 40.7128, "lon": -74.0060, "name": "New York"},
                "user": "shop_1"
            }
        ]
    }
}
"""

import json
import os
import random
import secrets
from datetime import datetime, timedelta
from pathlib import Path

from flask import Flask, jsonify, render_template, request

# ---------------------------------------------------------------------------
# App Configuration
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

LEDGER_FILE = Path(__file__).parent / "ledger.json"

# ---------------------------------------------------------------------------
# Known Valid Serial Numbers (issued_series_log)
# These represent serial numbers verified by a central bank or authority.
# ---------------------------------------------------------------------------
issued_series_log = {
    "A1B2C3D4": "Verified",
    "X9Y8Z7W6": "Verified",
    "FLAG1234": "Verified",
    "M5N6O7P8": "Verified",
    "Q3R4S5T6": "Verified",
}

# ---------------------------------------------------------------------------
# Simulated Location Profiles
# Used to simulate GPS capture for demo purposes.
# ---------------------------------------------------------------------------
LOCATIONS = [
    {"lat": 40.7128, "lon": -74.0060, "name": "New York, NY"},
    {"lat": 34.0522, "lon": -118.2437, "name": "Los Angeles, CA"},
    {"lat": 41.8781, "lon": -87.6298, "name": "Chicago, IL"},
    {"lat": 29.7604, "lon": -95.3698, "name": "Houston, TX"},
    {"lat": 33.4484, "lon": -112.0740, "name": "Phoenix, AZ"},
]

# ---------------------------------------------------------------------------
# Dummy OCR Serial Numbers
# Simulated OCR results for demo when no real OCR is available.
# ---------------------------------------------------------------------------
DUMMY_SERIALS = ["A1B2C3D4", "X9Y8Z7W6", "FLAG1234", "M5N6O7P8", "FAKE9999", "UNK00001"]


# ===========================================================================
# Data Persistence — JSON File Piping (Option A)
# ===========================================================================
def load_ledger() -> dict:
    """
    Load the scanned bills ledger from ledger.json at startup.
    Returns an empty dict if the file doesn't exist or is corrupt.
    """
    if LEDGER_FILE.exists():
        try:
            data = json.loads(LEDGER_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict) and "all_scanned_bills" in data:
                return data["all_scanned_bills"]
        except (json.JSONDecodeError, KeyError):
            pass
    return {}


def save_ledger(all_scanned_bills: dict) -> None:
    """
    Persist the updated all_scanned_bills dict to ledger.json
    after every successful scan processing.
    """
    payload = {"all_scanned_bills": all_scanned_bills}
    LEDGER_FILE.write_text(
        json.dumps(payload, indent=2, default=str), encoding="utf-8"
    )


# Load existing data on startup
all_scanned_bills: dict = load_ledger()


# ===========================================================================
# Simulated OCR Function
# ===========================================================================
def simulate_ocr(has_image: bool, manual_serial=None):
    """
    Simulated OCR function.
    - If a manual serial number is provided, use that directly.
    - If an image is uploaded (has_image=True), pick a random dummy serial.
    - Otherwise return empty string.
    """
    if manual_serial and manual_serial.strip():
        # Sanitize: keep only alphanumeric characters
        return "".join(c for c in manual_serial.strip().upper() if c.isalnum())[:20]
    if has_image:
        return random.choice(DUMMY_SERIALS)
    return ""


# ===========================================================================
# Simulated GPS Capture
# ===========================================================================
def simulate_gps(location_index=None):
    """
    Simulate capturing GPS location.
    Uses static dummy data for demo purposes.
    """
    if location_index is not None and 0 <= location_index < len(LOCATIONS):
        return LOCATIONS[location_index]
    return random.choice(LOCATIONS)


# ===========================================================================
# Core Clone Detection Logic
# ===========================================================================
def check_bill(serial: str, current_timestamp: datetime, current_location: dict) -> dict:
    """
    Core verification & clone-detection logic.

    Steps:
    1. Check if serial exists in issued_series_log → if not, flag UNVERIFIED.
    2. Search all_scanned_bills for prior scans of this serial.
    3. Innovation Rule: If found AND (time_delta < 1 hour) AND (location differs),
       flag as CLONED / COUNTERFEIT.
    4. Append current scan to the ledger and persist.

    Returns a result dict with status, message, history, etc.
    """
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

    # --- Step 1: Verify against issued series ---
    if serial not in issued_series_log:
        result["status"] = "INVALID"
        result["status_code"] = "red"
        result["message"] = (
            "Serial number series unrecognized. "
            "This note is NOT in the verified issuance database."
        )
        # Still record the scan for forensic purposes
        scan_record = {
            "timestamp": current_timestamp.isoformat(),
            "location": current_location,
            "user": "shop_1",
        }
        all_scanned_bills.setdefault(serial, []).append(scan_record)
        save_ledger(all_scanned_bills)
        result["history"] = all_scanned_bills.get(serial, [])
        return result

    # --- Step 2 & 3: Check for clones ---
    previous_scans = all_scanned_bills.get(serial, [])
    clone_detected = False

    if previous_scans:
        # Get the most recent previous scan
        most_recent = previous_scans[-1]
        prev_time = datetime.fromisoformat(most_recent["timestamp"])
        prev_loc = most_recent["location"]

        time_delta = current_timestamp - prev_time
        location_differs = (
            current_location["lat"] != prev_loc["lat"]
            or current_location["lon"] != prev_loc["lon"]
        )

        # Innovation Rule: < 1 hour AND different location → CLONE
        if time_delta < timedelta(hours=1) and location_differs:
            clone_detected = True

    # --- Step 4: Record the scan ---
    scan_record = {
        "timestamp": current_timestamp.isoformat(),
        "location": current_location,
        "user": "shop_1",
    }
    all_scanned_bills.setdefault(serial, []).append(scan_record)
    save_ledger(all_scanned_bills)

    # Build result
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


# ===========================================================================
# Routes
# ===========================================================================
@app.route("/")
def index():
    """Render the main dashboard."""
    return render_template("index.html")


@app.route("/api/process", methods=["POST"])
def process_scan():
    """
    Process a bill scan.
    Accepts: multipart form with optional image file and/or manual serial number,
             plus optional location_index.
    Returns: JSON result with status, message, history.
    """
    has_image = "image" in request.files and request.files["image"].filename != ""
    manual_serial = request.form.get("serial", "").strip()
    location_index_str = request.form.get("location_index", "")

    # Parse location index
    location_index = None
    if location_index_str.isdigit():
        location_index = int(location_index_str)

    # Extract serial via simulated OCR
    serial = simulate_ocr(has_image, manual_serial if manual_serial else None)

    if not serial:
        return jsonify({"error": "No serial number could be extracted. Please upload an image or enter a serial number manually."}), 400

    # Capture current timestamp and simulated GPS
    current_timestamp = datetime.now()
    current_location = simulate_gps(location_index)

    # Run core check logic
    result = check_bill(serial, current_timestamp, current_location)

    return jsonify(result)


@app.route("/api/history", methods=["GET"])
def get_history():
    """Return the full scan ledger for the dashboard history view."""
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
    # Sort by timestamp descending
    history.sort(key=lambda x: x["timestamp"], reverse=True)
    return jsonify({"history": history, "total_scans": len(history)})


@app.route("/api/locations", methods=["GET"])
def get_locations():
    """Return available simulated locations."""
    return jsonify({"locations": LOCATIONS})


@app.route("/api/reset", methods=["POST"])
def reset_ledger():
    """Reset the ledger (clear all scan data). For demo/testing only."""
    global all_scanned_bills
    all_scanned_bills = {}
    save_ledger(all_scanned_bills)
    return jsonify({"message": "Ledger reset successfully."})


# ===========================================================================
# Entry Point
# ===========================================================================
if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
