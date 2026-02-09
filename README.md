# KingsForms Automation

A robust, headless browser-based automation tool for KingsForms submissions with enhanced error handling, real-time monitoring, and anti-detection measures.

## 🚀 Features

- **Headless Browser Automation**: Uses Puppeteer for reliable, browser-based form filling
- **Robust Error Handling**: Comprehensive retry logic with configurable attempts
- **Real-time Monitoring**: Live status updates and progress tracking
- **Advanced CSV Processing**: Intelligent validation and data cleaning
- **Anti-Detection Measures**: Random delays, user agent rotation, and human-like behavior
- **Modern Web Interface**: Beautiful, responsive UI with drag-and-drop file upload
- **Comprehensive Logging**: Winston-based logging with multiple levels and formats

## 📋 Prerequisites

- Node.js 16+ installed on your system
- npm or yarn package manager
- Stable internet connection
- Access to the KingsForms URL you want to automate

## 🛠️ Installation Guide

### Step 1: Download the Application
1. Clone or download the project files to your computer
2. Extract the files to a folder of your choice (e.g., `kingsform-automation`)

### Step 2: Install Dependencies
1. Open your command prompt or terminal
2. Navigate to the project directory:
   ```bash
   cd C:\path\to\kingsform-automation
   ```
3. Install the required packages:
   ```bash
   npm install
   ```

### Step 3: Configure Environment (Optional)
1. Open the `.env` file in a text editor
2. Modify settings as needed (see Configuration section below)
3. Save the file

## 📊 Step-by-Step Usage Guide

### Step 1: Prepare Your CSV Data
1. Create a CSV file with the following required columns:
   - `Title` (Pastor, Elder, Brother, Sister, etc.)
   - `First Name`
   - `Last Name`
   - `Phone Number` (will be auto-formatted)
   - `Email`
   - `Marital Status`
   - `Group`
   - `Church Name`

2. Optional columns (if available):
   - `Kingschat Handle`
   - `Birthday`
   - `Gender`
   - `Age`
   - `Cell Name`
   - `Sub-Teams` (comma-separated if multiple)

3. Ensure your CSV follows these formatting rules:
   - Use UTF-8 encoding
   - Include column headers in the first row
   - Phone numbers can be in various formats (will be normalized)
   - Email addresses must be valid
   - Names should contain only letters, spaces, hyphens, and apostrophes

### Step 2: Start the Application
1. Open your command prompt or terminal
2. Navigate to the project directory:
   ```bash
   cd C:\path\to\kingsform-automation
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Wait for the server to start (you'll see a message indicating the server is running)
5. Open your web browser and go to: `http://localhost:3000`

### Step 3: Upload and Validate Your CSV
1. On the web interface, click the "Choose File" button or drag and drop your CSV file
2. Wait for the file to upload and validate
3. Check the validation results:
   - Green checkmarks indicate successful validation
   - Red errors show problematic rows that need correction
4. If there are validation errors, correct your CSV file and re-upload

### Step 4: Configure Submission Settings
1. Adjust the "Submission Delay" if needed (minimum 3 seconds recommended)
2. Optionally set a "Start Index" if you want to resume from a specific record
3. Review the summary showing the number of valid records to be processed

### Step 5: Start the Automation
1. Click the "Start Automation" button
2. Monitor the progress in real-time:
   - Current record being processed
   - Total records processed
   - Success/failure counts
   - Progress percentage
3. Use the "Pause" button to temporarily stop processing
4. Use the "Stop" button to completely halt the automation

### Step 6: Monitor and Review Results
1. Watch the live status updates during processing
2. Check the logs in the `logs/` directory for detailed information
3. After completion, review the success/failure statistics
4. If some records failed, you can adjust the start index and re-run for failed records only

## ⚙️ Configuration Options

### Environment Variables (.env)
You can customize the application behavior by editing the `.env` file:

```
# Server Configuration
PORT=3000                    # Port for the web interface
NODE_ENV=development         # Environment mode

# KingsForms Settings
KINGSFORMS_URL=https://kingsforms.online/nobphcephzone3  # Target form URL
FORM_TIMEOUT=30000           # Time to wait for form elements (milliseconds)
SUBMISSION_DELAY=5000        # Delay between submissions (milliseconds)
MAX_RETRIES=3                # Number of retry attempts for failed submissions
RANDOM_DELAY_VARIATION=0.2   # Variation in submission delays (0.2 = ±20%)

# Browser Settings
HEADLESS=false               # Run browser in headless mode (true/false)
BROWSER_WIDTH=1366           # Browser window width
BROWSER_HEIGHT=768           # Browser window height
USER_AGENT=Mozilla/5.0...    # Custom user agent string

# Logging
LOG_LEVEL=info               # Log level (error, warn, info, debug)
LOG_FILE=logs/automation.log # Log file path
```

## 📁 Project Structure

```
kingsform-automation/
├── src/
│   ├── logger.js           # Winston logging configuration
│   ├── csvProcessor.js     # CSV validation and processing
│   ├── automationEngine.js # Puppeteer automation logic
│   └── server.js           # Express server and API routes
├── public/
│   └── index.html          # Web interface
├── uploads/                # Temporary file storage
├── logs/                   # Application logs
├── data/                   # Persistent data storage
├── backups/                # Backup files
├── .env                    # Environment configuration
├── package.json            # Dependencies and scripts
├── index.js                # Application entry point
└── README.md               # This file
```

## 🛡️ Anti-Detection Features

The application includes several measures to avoid detection:
- **Random Delays**: ±20% variation in submission intervals
- **Human-like Behavior**: Realistic typing speeds and interactions
- **User Agent Rotation**: Configurable browser fingerprints
- **Form Field Handling**: Proper event triggering and validation
- **Error Recovery**: Intelligent retry with page refresh

## 🚨 Troubleshooting

### Common Issues and Solutions

**Browser Launch Failed**
- Error: "Failed to launch browser"
- Solution: Ensure Chrome/Chromium is installed, try running with `HEADLESS=true` in .env

**Form Not Found**
- Error: "Submit button not found"
- Solution: Verify the KingsForms URL is correct, check if the form structure has changed

**CSV Validation Errors**
- Solution: Check for missing required fields, verify email and phone number formats, ensure proper CSV encoding

**Slow Performance**
- Solution: Increase FORM_TIMEOUT in .env, reduce submission delay slightly, ensure stable internet connection

### Debug Mode
Set `LOG_LEVEL=debug` in `.env` for detailed logging to help troubleshoot issues.

### Checking Logs
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- All logs are timestamped for easy tracking

## 💡 Best Practices

1. **Test with Small Datasets First**: Always test with 1-3 records before processing large datasets
2. **Monitor During Processing**: Keep an eye on the first few submissions to ensure everything works correctly
3. **Adjust Delays Appropriately**: Higher delays reduce the chance of detection but increase processing time
4. **Validate Your Data**: Ensure your CSV meets all validation requirements before processing
5. **Backup Important Data**: Keep copies of your original CSV files
6. **Run During Off-Peak Hours**: Process submissions when network traffic is lower for better reliability

## 📈 Performance Expectations

- **Typical Speed**: 5-10 seconds per submission (including delays)
- **Success Rate**: >95% with proper configuration
- **Memory Usage**: ~150MB per browser instance
- **Concurrent Sessions**: 1 (sequential processing recommended)

## ⚠️ Disclaimer

This tool is for legitimate form automation purposes only. Users are responsible for complying with KingsForms terms of service and applicable laws. The developers are not responsible for misuse of this software.

## 🆘 Support

For issues and questions:
1. Check the logs in the `logs/` directory
2. Verify your CSV format matches the requirements
3. Ensure stable internet connection
4. Try with `HEADLESS=true` in .env for debugging
5. Contact the developer if issues persist

## 👨‍💻 Author

- **Sani Kana** - Creator and Lead Developer

---

**Version**: 2.0.0  
**Last Updated**: February 2026  
**Compatibility**: Node.js 16+
