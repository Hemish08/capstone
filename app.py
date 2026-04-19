# ── STUPID FILE CONVERTER BACKEND ──
# Think of this file as the "Brain" of your website. It handles all the rules,
# sends the emails, and does the actual converting when someone uploads a file.

# Step 1: Bring in all the tools we need to build our app
from flask import Flask, request, send_file, render_template, abort, jsonify, session, redirect, url_for
from werkzeug.utils import secure_filename   # This makes sure file names are safe (no hackers!)
from pdf2docx import Converter               # This magical tool turns PDFs into Word Docs
from docx2pdf import convert as docx2pdf_convert # This magical tool turns Word Docs into PDFs
import os, uuid, smtplib                     # Tools for files, random IDs, and sending emails
from email.mime.text import MIMEText         # Tools to make our emails look pretty
from email.mime.multipart import MIMEMultipart

# Step 2: Create our web server! We will call it "app"
app = Flask(__name__)

# This is a secret password our website uses to remember who is logged in. 
# Keep it secret, keep it safe!
app.secret_key = 'stupid-file-converter-secret-2024'  

# This tells the server: "Don't let anyone upload a file bigger than 500 Megabytes!"
# (500 * 1024 * 1024 is the math to calculate exactly 500 MB in bytes)
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024  

# Step 3: Create folders on your computer where we will save the files
UPLOAD_FOLDER = "uploads"    # Where we save the file the user gives us
OUTPUT_FOLDER = "outputs"    # Where we save the finished, converted file

# If these folders don't exist yet, we tell the computer to create them right now!
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# ── EMAIL SETTINGS ───────────────────────────────────────────────────────────
# We need an email address to send the 6-digit login codes from.
# Google no longer allows normal passwords here, so we must use an "App Password"!
EMAIL_ADDRESS  = "hemish.u8192@gmail.com"       # The email account doing the sending
EMAIL_PASSWORD = "qzmusfkszlxqjspl"           # The secret 16-letter Google App Password

# ── MEMORY ───────────────────────────────────────────────────────────────────
# We use this empty dictionary (like a blank notebook) to remember which 
# converted file belongs to which person when they go to download it.
pending_downloads = {}


# ── EMAIL MAKER ──────────────────────────────────────────────────────────────
def build_email_html(otp_code):
    """
    This function takes the 6-digit code and builds a beautiful, colorful HTML 
    design around it, so the email looks professional when it lands in the inbox!
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                margin: 0; padding: 0;
                background: #f0f4f8;
                font-family: 'Helvetica Neue', Arial, sans-serif;
            }}
            .wrapper {{
                max-width: 520px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 24px rgba(0,0,0,0.10);
            }}
            .header {{
                background: #5ba3b5;
                padding: 32px 40px 24px;
                text-align: center;
            }}
            .logo-title {{
                font-size: 32px; font-weight: 900;
                color: #ffffff; letter-spacing: 2px;
                text-transform: uppercase;
                text-shadow: 3px 3px 0 #1a1a1a;
                margin: 0; line-height: 1;
            }}
            .logo-subtitle {{
                font-size: 20px; font-weight: 700;
                color: #ffd045; letter-spacing: 2px;
                text-transform: uppercase;
                text-shadow: 2px 2px 0 #1a1a1a;
                margin: 6px 0 0;
            }}
            .fish-emoji {{ font-size: 36px; display: block; margin-bottom: 10px; }}
            .body {{ padding: 36px 40px; text-align: center; }}
            .welcome-text {{ font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0 0 10px; }}
            .glad-text {{ font-size: 15px; color: #555555; line-height: 1.6; margin: 0 0 28px; }}
            .otp-label {{ font-size: 13px; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }}
            .otp-box {{
                background: #f7f9fc;
                border: 2px dashed #5ba3b5;
                border-radius: 12px;
                padding: 20px; margin: 0 auto 28px;
                display: inline-block; min-width: 200px;
            }}
            .otp-code {{
                font-size: 42px; font-weight: 900;
                color: #5ba3b5; letter-spacing: 10px;
                margin: 0; font-family: 'Courier New', monospace;
            }}
            .expire-text {{ font-size: 13px; color: #aaaaaa; margin: 0 0 24px; }}
            .divider {{ border: none; border-top: 1px solid #eeeeee; margin: 24px 0; }}
            .footer {{ background: #f7f9fc; padding: 20px 40px; text-align: center; }}
            .warm-regards {{ font-size: 14px; color: #555555; margin: 0; line-height: 1.7; }}
            .team-name {{ font-size: 15px; font-weight: 700; color: #5ba3b5; }}
            .ignore-text {{ font-size: 12px; color: #bbbbbb; margin-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <span class="fish-emoji">🐟</span>
                <p class="logo-title">STUPID FILE</p>
                <p class="logo-subtitle">CONVERTER</p>
            </div>
            <div class="body">
                <p class="welcome-text">Welcome to our website!</p>
                <p class="glad-text">We're glad to have you here. 🎉<br>Use the code below to complete your login.</p>
                <p class="otp-label">Your one-time login code</p>
                <div class="otp-box">
                    <p class="otp-code">{otp_code}</p>
                </div>
                <p class="expire-text">⏱ This code expires in <strong>10 minutes</strong>. Do not share it.</p>
                <hr class="divider">
                <p class="ignore-text">If you did not request this code, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p class="warm-regards">
                    Warm regards,<br>
                    <span class="team-name">— Stupid File Converter Team 🐟</span>
                </p>
            </div>
        </div>
    </body>
    </html>
    """


# ── EMAIL SENDER FUNCTION ─────────────────────────────────────────────────────
def send_email(to_address, otp_code):
    """
    This function actually packages up the pretty email above and physically 
    sends it through the internet using Google's mail servers!
    """
    # 1. Get the pretty HTML design
    html_content = build_email_html(otp_code)

    # 2. Setup the envelope parameters (Subject, Who from, Who to)
    msg = MIMEMultipart("alternative")
    msg['Subject'] = "Stupid File Converter - Login OTP"
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = to_address
    
    # 3. Put the pretty design inside the envelope
    part = MIMEText(html_content, 'html')
    msg.attach(part)
    
    # 4. Check if we accidentally left the default password in here
    if EMAIL_PASSWORD == "your_app_password_here":
        raise Exception("Google blocked normal passwords! You CANNOT use your normal password. Check your python terminal or ask me how to create an App Password.")
    
    # 5. The actual sending step! We log into Google and hit send.
    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"SMTP Error details: {e}")
        raise Exception(f"Failed to login to Google. Did you remember to use an App Password? Error details: {str(e)}")


# ── LOGIN & SECURITY RULES ────────────────────────────────────────────────────

# If someone visits "http://yourwebsite.com/login", run this code:
@app.route("/login", methods=["GET"])
def login():
    """Decides if the user should see the login screen or not."""
    
    # Check our memory. Are they already logged in? 
    if session.get("logged_in"):
        # Yes! Send them straight to the main page!
        return redirect(url_for("index"))
        
    # No, they are a stranger. Show them the login.html page!
    return render_template("login.html")


# When the user clicks "SEND CODE" on the website, the website sends a signal here:
@app.route("/send-otp", methods=["POST"])
def send_otp():
    """Reads the user's email address and blasts out the OTP email."""
    
    # Read the data the website sent us (email address and the secret code)
    data    = request.get_json()
    method  = data.get("method")    # 'email'
    contact = data.get("contact")   # their email address
    otp     = data.get("otp")       # the 6-digit code!

    # If they forgot to send something, give an error
    if not method or not contact or not otp:
        return jsonify({"success": False, "error": "Missing data."})

    # If it's an email request, try to send the email!
    if method == "email":
        try:
            send_email(contact, otp) 
            return jsonify({"success": True}) # Yay, it sent!
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}) # Uh oh, it failed.

    # If it's not email, we don't know what it is
    return jsonify({"success": False, "error": "Unknown method."})


# When the user types the 6 digits and clicks "VERIFY", it sends a signal here:
@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    """Gives the user their VIP Pass so they never have to log in again!"""
    
    data = request.get_json() or {}
    
    # "logged_in = True" is their VIP Pass! It saves inside their browser cookie.
    session["logged_in"] = True
    
    # We also remember their email address so we can show it in the top right corner.
    session["email"] = data.get("email", "User")
    
    return jsonify({"success": True})


# When the user hits the "LOG OUT" button, it runs this code:
@app.route("/logout")
def logout():
    """Tears up their VIP Pass and kicks them back to the login screen."""
    session.clear() # Goodbye VIP pass!
    return redirect(url_for("login"))


# ── THE CONVERTER ENGINE ──────────────────────────────────────────────────────

# When someone visits the MAIN page "http://yourwebsite.com/", run this code:
@app.route("/", methods=["GET"])
def index():
    """Checks if they have a VIP Pass, and if they do, shows the converter!"""
    
    # Do they NOT have a VIP pass?
    if not session.get("logged_in"):
        # Kick them out to the login screen!
        return redirect(url_for("login"))
        
    # Wow they are logged in! Give them the main index.html page and tell the 
    # page what their email address is so it can say hello!
    return render_template("index.html", user_email=session.get("email", "User"))


# -- PDF TO WORD ENGINE --
def pdf_to_word(src, dst):
    """A tiny machine that takes a PDF and spits out a Word Doc."""
    cv = Converter(src)
    try:
        cv.convert(dst)
    finally:
        cv.close()


# -- WORD TO PDF ENGINE --
def word_to_pdf(src, dst):
    """A tiny machine that takes a Word Doc and spits out a PDF."""
    try:
        import pythoncom
        pythoncom.CoInitialize()
        docx2pdf_convert(src, dst)
        pythoncom.CoUninitialize()
    except ImportError:
        docx2pdf_convert(src, dst)

    if not os.path.exists(dst):
        raise RuntimeError("Conversion failed. Make sure MS Word or LibreOffice is installed.")


# When the user hits the big "CONVERT FILE STUPIDLY FAST" button, it runs THIS code:
@app.route("/", methods=["POST"])
def convert():
    """The brain of the operation. Takes the file, figures out what to do, and converts it!"""

    # If a clever hacker tries to skip the login page and just send files...
    # We check their VIP pass again!
    if not session.get("logged_in"):
        return redirect(url_for("login"))

    input_fmt  = request.form.get("input_fmt",  "pdf")   # What are we converting from?
    output_fmt = request.form.get("output_fmt", "docx")  # What are we converting to?
    uploaded   = request.files.get("file")               # Grab the actual file they uploaded!

    # Did they forget to pick a file? Show an error!
    if not uploaded or uploaded.filename == "":
        return render_template("index.html",
            user_email=session.get("email", "User"),
            input_fmt=input_fmt, output_fmt=output_fmt,
            error="No file uploaded. Please choose a file.")

    # Figure out the file's name and type (its extension, like .pdf)
    ext  = uploaded.filename.rsplit(".", 1)[-1].lower() if "." in uploaded.filename else ""
    stem = os.path.splitext(secure_filename(uploaded.filename))[0]
    
    # Give the file a random, crazy unique ID like "a37c9f82b" so nothing gets mixed up!
    uid  = uuid.uuid4().hex

    # Decide exactly where to save the files on the computer
    upload_path   = os.path.join(UPLOAD_FOLDER, f"{uid}.{ext}")
    output_path   = None
    download_name = None

    # Step 1: Save the file the user gave us!
    uploaded.save(upload_path)

    # Step 2: Try to convert it!
    try:
        # If they want PDF to Word...
        if ext == "pdf" and output_fmt == "docx":
            output_path   = os.path.join(OUTPUT_FOLDER, f"{uid}.docx")
            download_name = f"{stem}.docx" # The name it will have when they download it
            pdf_to_word(upload_path, output_path)

        # If they want Word to PDF...
        elif ext in ("docx", "doc") and output_fmt == "pdf":
            output_path   = os.path.join(OUTPUT_FOLDER, f"{uid}.pdf")
            download_name = f"{stem}.pdf"
            word_to_pdf(upload_path, output_path)

        # If they asked for something weird...
        else:
            return render_template("index.html",
                user_email=session.get("email", "User"),
                input_fmt=input_fmt, output_fmt=output_fmt,
                error="Only PDF → Word and Word → PDF are supported.")

        # Ensure the file actually got created, just to be extremely safe!
        if not output_path or not os.path.exists(output_path):
            raise Exception("Output file was not created.")

    # If ANYTHING goes wrong (it broke, file corrupted, etc...) we catch the error!
    except Exception as e:
        return render_template("index.html",
            user_email=session.get("email", "User"),
            input_fmt=input_fmt, output_fmt=output_fmt,
            error=f"Conversion failed: {str(e)}")

    # No matter what happens, we ALWAYS delete the original file they uploaded!
    # This keeps our computer clean and saves space.
    finally:
        if os.path.exists(upload_path):
            os.remove(upload_path)

    # Step 3: Yay it worked! Give them a magical Download Token so they can fetch their new file.
    token = uuid.uuid4().hex
    pending_downloads[token] = {"path": output_path, "name": download_name}

    # Show them the main page again, but this time with the big Download button lit up!
    return render_template("index.html",
        user_email=session.get("email", "User"),
        input_fmt=input_fmt, output_fmt=output_fmt,
        download_token=token, download_name=download_name)


# When they click that magical "DOWNLOAD" button, run this code:
@app.route("/download/<token>")
def download(token):
    """Looks up their Download Token, finds the file, and hands it to their browser!"""
    
    # Grab the file details out of our memory notebook and delete it from memory
    entry = pending_downloads.pop(token, None)
    
    # If the token was fake or the file doesn't exist, tell them "404 Not Found"
    if not entry or not os.path.exists(entry["path"]):
        abort(404)
        
    # Ta-da! Give them the file directly!
    return send_file(entry["path"], as_attachment=True, download_name=entry["name"])


# Oh no! They uploaded a file bigger than 500 MB!
@app.errorhandler(413)
def too_large(e):
    """Catches giant files and slaps them with an error message."""
    return render_template("index.html",
        user_email=session.get("email", "User"),
        input_fmt="pdf", output_fmt="docx",
        error="File too large. Maximum 500 MB."), 413


# This is the ignition switch. It tells the server to completely power on!
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")