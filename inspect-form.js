const puppeteer = require("puppeteer");

async function inspectForm() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage();

  try {
    console.log("Navigating to form...");
    await page.goto("https://kingsforms.online/nobphcephzone3", {
      waitUntil: "networkidle2",
    });

    // Wait for form to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("Inspecting form elements...");

    // Get all input, select, and textarea elements
    const elements = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll("input, select, textarea")
      );
      return inputs.map((el, index) => ({
        index,
        tagName: el.tagName,
        type: el.type || "N/A",
        name: el.name || "N/A",
        id: el.id || "N/A",
        className: el.className || "N/A",
        placeholder: el.placeholder || "N/A",
        value: el.value || "N/A",
      }));
    });

    console.log("Found elements:");
    elements.forEach((el) => {
      console.log(
        `${el.index}: ${el.tagName} - name: "${el.name}", id: "${el.id}", type: "${el.type}", class: "${el.className}"`
      );
    });

    // Also check for submit button
    const submitButtons = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll("button, input[type='submit']")
      );
      return buttons.map((btn, index) => ({
        index,
        tagName: btn.tagName,
        type: btn.type || "N/A",
        name: btn.name || "N/A",
        id: btn.id || "N/A",
        className: btn.className || "N/A",
        text: btn.textContent?.trim() || "N/A",
      }));
    });

    console.log("\nSubmit buttons:");
    submitButtons.forEach((btn) => {
      console.log(
        `${btn.index}: ${btn.tagName} - id: "${btn.id}", class: "${btn.className}", text: "${btn.text}"`
      );
    });

    // Check select options
    console.log("\nSelect options:");
    const selects = await page.$$("select");
    for (let i = 0; i < selects.length; i++) {
      const selectName = await page.evaluate((el) => el.name, selects[i]);
      const options = await page.evaluate((el) => {
        return Array.from(el.options).map((opt) => ({
          value: opt.value,
          text: opt.text.trim(),
        }));
      }, selects[i]);
      console.log(`Select ${i} (${selectName}):`);
      options.forEach((opt) => console.log(`  "${opt.value}": "${opt.text}"`));
    }

    // Check for iframes
    console.log("\nIframes:");
    const iframes = await page.$$("iframe");
    console.log(`Found ${iframes.length} iframes`);

    // Check if form is inside an iframe
    const formInIframe = await page.evaluate(() => {
      const iframes = document.querySelectorAll("iframe");
      for (let iframe of iframes) {
        try {
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc.querySelector("form")) {
            return true;
          }
        } catch (e) {
          // Cross-origin iframe
        }
      }
      return false;
    });
    console.log(`Form in iframe: ${formInIframe}`);

    // Check for shadow DOM
    const hasShadowDom = await page.evaluate(() => {
      const allElements = document.querySelectorAll("*");
      for (let el of allElements) {
        if (el.shadowRoot) {
          return true;
        }
      }
      return false;
    });
    console.log(`Has shadow DOM: ${hasShadowDom}`);

    // Try to find elements using different methods
    console.log("\nTesting selectors:");
    const testSelectors = [
      '[name="answer-0"]',
      "#answer-0",
      'select[name="answer-0"]',
      'input[name="answer-1"]',
      "#answer-1",
    ];

    for (let selector of testSelectors) {
      try {
        const element = await page.$(selector);
        const exists = element !== null;
        console.log(
          `Selector "${selector}": ${exists ? "FOUND" : "NOT FOUND"}`
        );
      } catch (error) {
        console.log(`Selector "${selector}": ERROR - ${error.message}`);
      }
    }

    // Try to fill a field and submit
    console.log("\nTesting form submission:");
    try {
      // Fill title
      const titleSelect = await page.$('[name="answer-0"]');
      if (titleSelect) {
        await titleSelect.select("Brother");
        console.log("Filled title");
      }

      // Fill first name
      const firstNameInput = await page.$('[name="answer-1"]');
      if (firstNameInput) {
        await firstNameInput.type("Test User");
        console.log("Filled first name");
      }

      // Click submit
      const submitBtn = await page.$("#submit-button");
      if (submitBtn) {
        await submitBtn.click();
        console.log("Clicked submit");

        // Wait for response
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Check if page changed or shows message
        const currentUrl = page.url();
        console.log(`Current URL after submit: ${currentUrl}`);

        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log(
          `Page contains "success": ${bodyText
            .toLowerCase()
            .includes("success")}`
        );
        console.log(
          `Page contains "error": ${bodyText.toLowerCase().includes("error")}`
        );
        console.log(
          `Page contains "thank": ${bodyText.toLowerCase().includes("thank")}`
        );
      }
    } catch (error) {
      console.log(`Form submission test failed: ${error.message}`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
}

inspectForm();
