const KingsFormsAutomationEngine = require("./src/automationEngine");
const CSVProcessor = require("./src/csvProcessor");

async function testAutomation() {
  try {
    console.log("Starting automation test...");

    // Process test CSV file
    const csvProcessor = new CSVProcessor();
    const result = await csvProcessor.processCSV("test-data.csv");

    if (result.records.length === 0) {
      console.error("No valid records found in CSV");
      return;
    }

    console.log(`Processed ${result.records.length} records`);

    // Initialize automation engine
    const engine = new KingsFormsAutomationEngine();

    // Test with just 1 record first
    const testRecords = result.records.slice(0, 1);

    console.log("Initializing browser...");
    await engine.initialize();

    console.log("Starting automation with 1 test record...");
    await engine.startAutomation(testRecords, 0);

    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    process.exit(0);
  }
}

testAutomation();
