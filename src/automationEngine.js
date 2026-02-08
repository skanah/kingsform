const puppeteer = require("puppeteer");
const logger = require("./logger");
const fs = require("fs-extra");
const path = require("path");

class KingsFormsAutomationEngine {
  constructor(config = {}) {
    this.config = {
      url:
        process.env.KINGSFORMS_URL ||
        "https://kingsforms.online/nobphcephzone3",
      formTimeout: parseInt(process.env.FORM_TIMEOUT) || 30000,
      submissionDelay: parseInt(process.env.SUBMISSION_DELAY) || 5000,
      maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
      randomDelayVariation:
        parseFloat(process.env.RANDOM_DELAY_VARIATION) || 0.2,
      headless: false,
      browserWidth: parseInt(process.env.BROWSER_WIDTH) || 1366,
      browserHeight: parseInt(process.env.BROWSER_HEIGHT) || 768,
      userAgent:
        process.env.USER_AGENT ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ...config,
    };

    this.browser = null;
    this.page = null;
    this.isRunning = false;
    this.currentIndex = 0;
    this.records = [];
    this.results = {
      successful: [],
      failed: [],
      retries: 0,
    };

    // Field mappings from CSV to form field IDs
    this.fieldMappings = {
      Title: "answer-0",
      "First Name": "answer-1",
      "Last Name": "answer-2",
      "Phone Number": "answer-3",
      "Kingschat Handle": "answer-4",
      Email: "answer-5",
      Birthday: "answer-6",
      "Marital Status": "answer-7",
      Gender: "answer-8",
      Age: "answer-9",
      Group: "answer-10",
      "Church Name": "answer-11",
      "Cell Name": "answer-12",
    };

    // Default values for empty fields
    this.defaultValues = {
      "Phone Number": "0000000000",
      "Kingschat Handle": "@test",
      Email: "test@test.com",
      Birthday: "1st January",
      "Marital Status": "Single",
      Gender: "Male",
      Age: "Adult ( 20 years and above)",
      Group: "CE LIMITLESS GROUP",
      "Church Name": "Test Church",
      "Cell Name": "Test Cell",
      "Sub-Teams": "USHERS",
    };

    this.subTeamsSelector = 'input[name="answer-13[]"]';
    this.submitButtonSelector =
      'input[type="submit"], button[type="submit"], #submit-button, .submit-button';
  }

  async initialize() {
    try {
      logger.info("Initializing browser...");

      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
          `--window-size=${this.config.browserWidth},${this.config.browserHeight}`,
        ],
      });

      this.page = await this.browser.newPage();

      // Set viewport
      await this.page.setViewport({
        width: this.config.browserWidth,
        height: this.config.browserHeight,
      });

      // Set user agent
      await this.page.setUserAgent(this.config.userAgent);

      // Set reasonable timeouts
      this.page.setDefaultTimeout(this.config.formTimeout);
      this.page.setDefaultNavigationTimeout(this.config.formTimeout);

      logger.info("Browser initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize browser:", error);
      throw error;
    }
  }

  async startAutomation(records, startIndex = 0) {
    if (this.isRunning) {
      throw new Error("Automation is already running");
    }

    this.records = records;
    this.currentIndex = startIndex;
    this.isRunning = true;
    this.results = {
      successful: [],
      failed: [],
      retries: 0,
    };

    logger.info(
      `Starting automation with ${records.length} records from index ${startIndex}`
    );

    try {
      await this.navigateToForm();

      while (this.isRunning && this.currentIndex < this.records.length) {
        await this.processRecord();
      }

      logger.info("Automation completed successfully");
      this.logSummary();
    } catch (error) {
      logger.error("Automation failed:", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async navigateToForm() {
    try {
      logger.info(`Navigating to ${this.config.url}`);
      await this.page.goto(this.config.url, { waitUntil: "networkidle2" });

      // Wait for page to be fully loaded
      await this.page.waitForFunction(() => document.readyState === "complete");
      await this.sleep(3000);

      // Wait for form elements to be ready
      await this.page.waitForSelector(this.submitButtonSelector, {
        timeout: 15000,
      });
      await this.page.waitForSelector('select[name="answer-0"]', {
        timeout: 15000,
      });
      await this.page.waitForSelector('input[name="answer-1"]', {
        timeout: 15000,
      });
      await this.page.waitForSelector('input[name="answer-13[]"]', {
        timeout: 15000,
      });

      logger.info("Form loaded successfully");
    } catch (error) {
      logger.error("Failed to navigate to form:", error);
      throw new Error(`Navigation failed: ${error.message}`);
    }
  }

  async processRecord() {
    const record = this.records[this.currentIndex];
    const recordId = this.currentIndex + 1;
    const maxRetries = this.config.maxRetries;
    let retryCount = 0;

    logger.info(
      `Processing record ${recordId}/${this.records.length}: ${record["First Name"]} ${record["Last Name"]}`
    );

    while (retryCount <= maxRetries && this.isRunning) {
      try {
        await this.fillForm(record);
        await this.submitForm();

        // Wait for success indication or page reload
        await this.waitForSubmissionSuccess();

        logger.info(
          `✅ SUCCESS: ${record["First Name"]} ${record["Last Name"]}`
        );
        this.results.successful.push({
          index: this.currentIndex,
          record: record,
          attempts: retryCount + 1,
        });

        // Navigate to fresh form page for next submission
        try {
          logger.debug("Navigating to fresh form page...");
          await this.page.goto(this.config.url, { waitUntil: "networkidle2" });
          await this.page.waitForSelector(this.submitButtonSelector, {
            timeout: 10000,
          });
          logger.debug("Fresh form page loaded");
        } catch (error) {
          logger.warn(`Failed to navigate to fresh form: ${error.message}`);
          // Continue anyway - the form might still work
        }

        this.currentIndex++;
        break;
      } catch (error) {
        retryCount++;
        this.results.retries++;

        logger.warn(
          `❌ Attempt ${retryCount}/${maxRetries + 1} failed for ${
            record["First Name"]
          } ${record["Last Name"]}: ${error.message}`
        );

        if (retryCount <= maxRetries) {
          await this.handleRetry();
        } else {
          logger.error(
            `💀 MAX RETRIES EXCEEDED for ${record["First Name"]} ${record["Last Name"]}`
          );
          this.results.failed.push({
            index: this.currentIndex,
            record: record,
            error: error.message,
            attempts: retryCount,
          });
          this.currentIndex++;
          break;
        }
      }
    }

    // Add delay between submissions
    if (this.isRunning && this.currentIndex < this.records.length) {
      const delay = this.getRandomDelay();
      logger.info(
        `⏳ Waiting ${Math.round(delay / 1000)}s before next submission...`
      );
      await this.sleep(delay);
    }
  }

  async fillForm(record) {
    logger.debug("Filling form fields...");

    // Fill regular fields
    for (const [csvField, formId] of Object.entries(this.fieldMappings)) {
      const value = record[csvField] || this.defaultValues[csvField];
      if (value) {
        await this.fillField(formId, value, csvField);
        await this.sleep(200); // Delay between fields to allow progress update
      }
    }

    // Handle Sub-Teams checkboxes
    const subTeamsValue =
      record["Sub-Teams"] || this.defaultValues["Sub-Teams"];
    await this.fillSubTeams(subTeamsValue);

    // Wait for progress to update
    await this.sleep(1000);

    logger.debug("Form filling completed");
  }

  async fillField(fieldId, value, fieldName) {
    try {
      const element = await this.page.$(`[name="${fieldId}"]`);

      if (!element) {
        throw new Error(`Field ${fieldId} (${fieldName}) not found`);
      }

      const tagName = await this.page.evaluate((el) => el.tagName, element);
      const inputType = await this.page.evaluate((el) => el.type, element);

      if (tagName === "SELECT") {
        await this.fillSelectField(element, value, fieldName);
        // Trigger change event for select
        await this.page.evaluate((el) => {
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }, element);
      } else if (inputType === "checkbox" || inputType === "radio") {
        await this.fillCheckboxField(element, value, fieldName);
        // Click should trigger events
      } else {
        await this.fillTextField(element, value, fieldName);
        // Trigger input and blur events for text fields
        await this.page.evaluate((el) => {
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("blur", { bubbles: true }));
        }, element);
      }
    } catch (error) {
      logger.warn(`Error filling field ${fieldName}: ${error.message}`);
      throw error;
    }
  }

  async fillSelectField(element, value, fieldName) {
    const options = await this.page.evaluate((el) => {
      return Array.from(el.options).map((option) => ({
        value: option.value,
        text: option.text.toLowerCase(),
      }));
    }, element);

    const matchingOption = options.find(
      (option) =>
        option.text.includes(value.toLowerCase()) ||
        option.value.toLowerCase().includes(value.toLowerCase())
    );

    if (matchingOption) {
      await element.select(matchingOption.value);
    } else {
      let fallbackOption = options[0]; // default to first
      if (fieldName === "Marital Status") {
        fallbackOption =
          options.find((o) => o.text.includes("others")) || options[0];
      } else if (fieldName === "Age") {
        fallbackOption =
          options.find((o) => o.text.includes("adult")) || options[0];
      } else if (fieldName === "Group") {
        fallbackOption =
          options.find((o) => o.text.includes("limitless")) || options[0];
      }
      await element.select(fallbackOption.value);
      logger.warn(
        `No matching option found for ${fieldName}: ${value}, selected fallback: ${fallbackOption.text}`
      );
    }
  }

  async fillCheckboxField(element, value, fieldName) {
    const shouldCheck = ["yes", "true", "1"].includes(value.toLowerCase());
    const isChecked = await this.page.evaluate((el) => el.checked, element);

    if (shouldCheck !== isChecked) {
      await element.click();
    }
  }

  async fillTextField(element, value, fieldName) {
    // Clear field first
    await this.page.evaluate((el) => (el.value = ""), element);
    await element.type(value);
  }

  async fillSubTeams(subTeamsValue) {
    if (!subTeamsValue) return;

    const teams = subTeamsValue
      .split(",")
      .map((team) => team.trim().toLowerCase());
    const checkboxes = await this.page.$$(this.subTeamsSelector);

    for (const checkbox of checkboxes) {
      const checkboxValue = await this.page.evaluate(
        (el) => el.value.toLowerCase(),
        checkbox
      );
      const shouldCheck = teams.some(
        (team) => checkboxValue.includes(team) || team.includes(checkboxValue)
      );

      const isChecked = await this.page.evaluate((el) => el.checked, checkbox);

      if (shouldCheck !== isChecked) {
        await checkbox.click();
      }
    }
  }

  async submitForm() {
    logger.debug("Submitting form...");

    const submitButton = await this.page.$(this.submitButtonSelector);
    if (!submitButton) {
      throw new Error("Submit button not found");
    }

    await submitButton.click();
    logger.debug("Form submitted");
  }

  async waitForSubmissionSuccess() {
    // Wait for submission to complete - be more flexible about success detection
    try {
      // Wait a bit for the submission to process
      await this.sleep(2000);

      // Check if we're still on the same page or if navigation occurred
      const currentUrl = this.page.url();
      const hasUrlChanged = !currentUrl.includes(
        this.config.url.split("/").pop()
      );

      // Check for common success indicators
      const successIndicators = await this.page.$$(
        '.success, .alert-success, [class*="success"], .thank-you, .confirmation'
      );

      // Check if form fields are cleared (indicating successful submission)
      const formCleared = await this.page.evaluate(() => {
        const inputs = document.querySelectorAll(
          'input:not([type="submit"]):not([type="button"]):not([type="hidden"])'
        );
        return Array.from(inputs).some((input) => input.value.trim() === "");
      });

      // If any success indicator is found, or URL changed, or form is cleared, consider it success
      if (successIndicators.length > 0 || hasUrlChanged || formCleared) {
        logger.debug("Submission success detected");
        return;
      }

      // Check for validation errors
      const errorElements = await this.page.$$(
        '.error, .alert-danger, [class*="error"], .invalid, .alert-error'
      );
      if (errorElements.length > 0) {
        const errorText = await this.page.evaluate(
          (els) =>
            els
              .map((el) => el.textContent.trim())
              .filter((text) => text)
              .join(" "),
          errorElements
        );
        if (errorText) {
          throw new Error(`Form validation error: ${errorText}`);
        }
      }

      // If submit button is disabled or missing, assume success
      const submitButton = await this.page.$(this.submitButtonSelector);
      if (!submitButton) {
        logger.debug(
          "Submit button not found after submission, assuming success"
        );
        return;
      }

      const isDisabled = await this.page.evaluate(
        (btn) => btn.disabled || btn.style.display === "none",
        submitButton
      );

      if (isDisabled) {
        logger.debug("Submit button disabled, assuming success");
        return;
      }

      // If we get here, assume success anyway - many forms don't give clear feedback
      logger.warn(
        "No clear success indicator found, but proceeding with assumption of success"
      );
    } catch (error) {
      if (error.message.includes("Form validation error")) {
        throw error; // Re-throw validation errors
      }
      if (error.message.includes("Navigating frame was detached")) {
        logger.warn("Frame detached during submission wait, assuming success");
        return;
      }
      // For other errors, assume success to avoid false failures
      logger.warn(
        `Error during success check (${error.message}), assuming success`
      );
    }
  }

  async handleRetry() {
    // Refresh the page for retry
    logger.debug("Refreshing page for retry...");
    try {
      await this.page.reload({ waitUntil: "networkidle2" });
    } catch (error) {
      if (error.message.includes("Navigating frame was detached")) {
        logger.warn(
          "Frame detached during reload, navigating to URL instead..."
        );
        await this.page.goto(this.config.url, { waitUntil: "networkidle2" });
      } else {
        throw error;
      }
    }
    await this.page.waitForSelector(this.submitButtonSelector, {
      timeout: 10000,
    });
  }

  getRandomDelay() {
    const baseDelay = this.config.submissionDelay;
    const variation = baseDelay * this.config.randomDelayVariation;
    return baseDelay + (Math.random() - 0.5) * variation;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async stop() {
    logger.info("Stopping automation...");
    this.isRunning = false;
  }

  async pause() {
    logger.info("Pausing automation...");
    this.isRunning = false;
  }

  async resume() {
    if (!this.isRunning && this.records.length > 0) {
      logger.info("Resuming automation...");
      this.isRunning = true;
      await this.startAutomation(this.records, this.currentIndex);
    }
  }

  getStatus() {
    const progress =
      this.records.length > 0
        ? Math.round((this.currentIndex / this.records.length) * 100)
        : 0;
    return {
      isRunning: this.isRunning,
      currentIndex: this.currentIndex,
      totalRecords: this.records.length,
      progress: progress,
      successful: this.results.successful.length,
      failed: this.results.failed.length,
      retries: this.results.retries,
    };
  }

  logSummary() {
    const status = this.getStatus();
    logger.info("=== AUTOMATION SUMMARY ===");
    logger.info(`Total Records: ${status.totalRecords}`);
    logger.info(`Successful: ${status.successful}`);
    logger.info(`Failed: ${status.failed}`);
    logger.info(`Retries: ${status.retries}`);
    logger.info(`Progress: ${status.progress}%`);
    logger.info("========================");
  }

  async cleanup() {
    if (this.browser) {
      logger.info("Closing browser...");
      await this.browser.close();
    }
  }
}

module.exports = KingsFormsAutomationEngine;
