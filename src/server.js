const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const logger = require("./logger");
const CSVProcessor = require("./csvProcessor");
const KingsFormsAutomationEngine = require("./automationEngine");

class KingsFormsServer {
  constructor() {
    this.app = express();
    this.csvProcessor = new CSVProcessor();
    this.automationEngine = null;
    this.uploadedData = null;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupStaticFiles();
  }

  setupMiddleware() {
    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // File upload configuration
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "..", "uploads");
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "data-" + uniqueSuffix + path.extname(file.originalname));
      },
    });

    const upload = multer({
      storage: storage,
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === "text/csv" ||
          path.extname(file.originalname).toLowerCase() === ".csv"
        ) {
          cb(null, true);
        } else {
          cb(new Error("Only CSV files are allowed"));
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    });

    this.upload = upload;
  }

  setupRoutes() {
    // Home page
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "..", "public", "index.html"));
    });

    // Upload CSV
    this.app.post(
      "/upload",
      this.upload.single("csvFile"),
      async (req, res) => {
        try {
          if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
          }

          logger.info(`Processing uploaded CSV: ${req.file.filename}`);

          const result = await this.csvProcessor.processCSV(req.file.path);

          if (result.records.length === 0) {
            return res.status(400).json({
              error: "No valid records found in CSV",
              details: result.errors,
            });
          }

          this.uploadedData = {
            filePath: req.file.path,
            records: result.records,
            summary: result.summary,
            timestamp: new Date().toISOString(),
          };

          logger.info(
            `CSV processed successfully: ${result.records.length} valid records`
          );

          res.json({
            success: true,
            data: {
              recordsCount: result.records.length,
              summary: result.summary,
              errors: result.errors.slice(0, 10), // Show first 10 errors
            },
          });
        } catch (error) {
          logger.error("Upload processing error:", error);
          res.status(500).json({ error: error.message });
        }
      }
    );

    // Start automation
    this.app.post("/start", async (req, res) => {
      try {
        if (!this.uploadedData) {
          return res
            .status(400)
            .json({ error: "No data uploaded. Please upload a CSV first." });
        }

        if (this.automationEngine && this.automationEngine.isRunning) {
          return res
            .status(400)
            .json({ error: "Automation is already running" });
        }

        // Initialize automation engine
        this.automationEngine = new KingsFormsAutomationEngine();
        await this.automationEngine.initialize();

        const startIndex = parseInt(req.body.startIndex) || 0;
        const delay = parseInt(req.body.delay) || 5000;

        // Update delay if provided
        if (delay !== 5000) {
          this.automationEngine.config.submissionDelay = delay;
        }

        // Start automation in background
        this.automationEngine
          .startAutomation(this.uploadedData.records, startIndex)
          .then(() => {
            logger.info("Automation completed successfully");
          })
          .catch((error) => {
            logger.error("Automation failed:", error);
          });

        res.json({
          success: true,
          message: "Automation started",
          totalRecords: this.uploadedData.records.length,
          startIndex: startIndex,
        });
      } catch (error) {
        logger.error("Start automation error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Stop automation
    this.app.post("/stop", async (req, res) => {
      try {
        if (!this.automationEngine) {
          return res.status(400).json({ error: "No automation running" });
        }

        await this.automationEngine.stop();
        res.json({ success: true, message: "Automation stopped" });
      } catch (error) {
        logger.error("Stop automation error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Pause automation
    this.app.post("/pause", async (req, res) => {
      try {
        if (!this.automationEngine) {
          return res.status(400).json({ error: "No automation running" });
        }

        await this.automationEngine.pause();
        res.json({ success: true, message: "Automation paused" });
      } catch (error) {
        logger.error("Pause automation error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Resume automation
    this.app.post("/resume", async (req, res) => {
      try {
        if (!this.automationEngine) {
          return res.status(400).json({ error: "No automation to resume" });
        }

        await this.automationEngine.resume();
        res.json({ success: true, message: "Automation resumed" });
      } catch (error) {
        logger.error("Resume automation error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get status
    this.app.get("/status", (req, res) => {
      if (!this.automationEngine) {
        return res.json({
          isRunning: false,
          currentIndex: 0,
          totalRecords: this.uploadedData
            ? this.uploadedData.records.length
            : 0,
          progress: 0,
          successful: 0,
          failed: 0,
          retries: 0,
        });
      }

      const status = this.automationEngine.getStatus();
      res.json(status);
    });

    // Download sample CSV
    this.app.get("/sample-csv", (req, res) => {
      const sampleData = this.csvProcessor.generateSampleCSV();

      let csvContent =
        "Title,First Name,Last Name,Phone Number,Kingschat Handle,Email,Birthday,Marital Status,Gender,Age,Group,Church Name,Cell Name,Sub-Teams\n";

      sampleData.forEach((record) => {
        const row = [
          record.Title,
          record["First Name"],
          record["Last Name"],
          record["Phone Number"],
          record["Kingschat Handle"],
          record.Email,
          record.Birthday,
          record["Marital Status"],
          record.Gender,
          record.Age,
          record.Group,
          record["Church Name"],
          record["Cell Name"],
          record["Sub-Teams"],
        ];
        csvContent += row.map((field) => `"${field}"`).join(",") + "\n";
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="kingsforms-sample.csv"'
      );
      res.send(csvContent);
    });

    // Get uploaded data info
    this.app.get("/data-info", (req, res) => {
      if (!this.uploadedData) {
        return res.json({ hasData: false });
      }

      res.json({
        hasData: true,
        summary: this.uploadedData.summary,
        timestamp: this.uploadedData.timestamp,
      });
    });

    // Clear uploaded data
    this.app.post("/clear", (req, res) => {
      try {
        if (this.uploadedData && this.uploadedData.filePath) {
          fs.removeSync(this.uploadedData.filePath);
        }

        this.uploadedData = null;

        if (this.automationEngine) {
          this.automationEngine.stop();
          this.automationEngine.cleanup();
          this.automationEngine = null;
        }

        res.json({ success: true, message: "Data cleared" });
      } catch (error) {
        logger.error("Clear data error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: require("../package.json").version,
      });
    });
  }

  setupStaticFiles() {
    // Serve static files from public directory
    this.app.use(express.static(path.join(__dirname, "..", "public")));

    // Serve uploaded files (for debugging)
    this.app.use(
      "/uploads",
      express.static(path.join(__dirname, "..", "uploads"))
    );
  }

  async start(port = process.env.PORT || 3000) {
    // Ensure required directories exist
    fs.ensureDirSync(path.join(__dirname, "..", "public"));
    fs.ensureDirSync(path.join(__dirname, "..", "uploads"));
    fs.ensureDirSync(path.join(__dirname, "..", "logs"));
    fs.ensureDirSync(path.join(__dirname, "..", "data"));
    fs.ensureDirSync(path.join(__dirname, "..", "backups"));

    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        logger.info(`KingsForms Automation Server running on port ${port}`);
        logger.info(`Access the web interface at: http://localhost:${port}`);
        resolve(this.server);
      });
    });
  }

  async stop() {
    if (this.automationEngine) {
      await this.automationEngine.stop();
      await this.automationEngine.cleanup();
    }

    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          logger.info("Server stopped");
          resolve();
        });
      });
    }
  }
}

module.exports = KingsFormsServer;
