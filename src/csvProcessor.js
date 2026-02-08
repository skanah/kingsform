const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

class CSVProcessor {
  constructor() {
    this.requiredFields = [
      "Title",
      "First Name",
      "Last Name",
      "Phone Number",
      "Email",
      "Marital Status",
      "Group",
      "Church Name",
    ];

    this.optionalFields = ["Kingschat Handle", "Birthday", "Age", "Sub-Teams"];

    this.fieldValidators = {
      Email: this.validateEmail.bind(this),
      "Phone Number": this.validatePhoneNumber.bind(this),
      "First Name": this.validateName.bind(this),
      "Last Name": this.validateName.bind(this),
      Title: this.validateTitle.bind(this),
      Birthday: this.validateBirthday.bind(this),
      "Marital Status": this.validateMaritalStatus.bind(this),
      Gender: this.validateGender.bind(this),
      Age: this.validateAge.bind(this),
    };
  }

  async processCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let rowNumber = 0;

      fs.createReadStream(filePath)
        .pipe(
          csv({
            skipEmptyLines: true,
            trim: true,
          })
        )
        .on("data", (data) => {
          rowNumber++;
          try {
            const validatedRecord = this.validateRecord(data, rowNumber);
            if (validatedRecord) {
              results.push(validatedRecord);
            }
          } catch (error) {
            errors.push({
              row: rowNumber,
              error: error.message,
              data: data,
            });
            logger.warn(`Row ${rowNumber} validation failed: ${error.message}`);
          }
        })
        .on("end", () => {
          logger.info(
            `CSV processing completed. Valid records: ${results.length}, Errors: ${errors.length}`
          );

          if (errors.length > 0) {
            logger.warn("Validation errors found:", errors);
          }

          resolve({
            records: results,
            errors: errors,
            summary: {
              totalRows: rowNumber,
              validRecords: results.length,
              invalidRecords: errors.length,
            },
          });
        })
        .on("error", (error) => {
          logger.error("CSV processing error:", error);
          reject(error);
        });
    });
  }

  validateRecord(data, rowNumber) {
    // Normalize headers for compatibility
    if (
      data.hasOwnProperty("Name of Cell") &&
      !data.hasOwnProperty("Cell Name")
    ) {
      data["Cell Name"] = data["Name of Cell"];
    }

    // Check required fields
    for (const field of this.requiredFields) {
      if (!data[field] || data[field].trim() === "") {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const record = {};

    // Validate and clean each field
    for (const [field, value] of Object.entries(data)) {
      if (
        this.requiredFields.includes(field) ||
        this.optionalFields.includes(field)
      ) {
        const trimmedValue = value.trim();
        if (this.requiredFields.includes(field) || trimmedValue !== "") {
          const validator = this.fieldValidators[field];
          if (validator) {
            record[field] = validator(trimmedValue, field);
          } else {
            record[field] = trimmedValue;
          }
        }
      }
    }

    return record;
  }

  validateEmail(email, field) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }
    return email.toLowerCase();
  }

  validatePhoneNumber(phone, field) {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, "");

    // Check if it's a valid phone number (10-15 digits)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      throw new Error(`Invalid phone number format: ${phone}`);
    }

    // Add country code if not present (assuming Nigeria +234)
    if (!cleanPhone.startsWith("234") && cleanPhone.length === 10) {
      return `+234${cleanPhone}`;
    } else if (!cleanPhone.startsWith("234") && !cleanPhone.startsWith("+")) {
      return `+234${cleanPhone}`;
    }

    return cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`;
  }

  validateName(name, field) {
    if (name.length < 2) {
      throw new Error(`${field} must be at least 2 characters long`);
    }
    if (!/^[a-zA-Z\s'-]+$/.test(name)) {
      throw new Error(`${field} contains invalid characters`);
    }
    return name;
  }

  validateTitle(title, field) {
    const validTitles = [
      "Pastor",
      "Elder",
      "Deacon",
      "Deaconess",
      "Brother",
      "Sister",
      "Mr",
      "Mrs",
      "Miss",
      "Dr",
      "Prof",
    ];
    if (
      !validTitles.some((valid) =>
        title.toLowerCase().includes(valid.toLowerCase())
      )
    ) {
      logger.warn(`Unusual title: ${title}`);
    }
    return title;
  }

  validateBirthday(birthday, field) {
    // Accept various formats: DD/MM/YYYY, DD-MM-YYYY, DD Month YYYY, etc.
    const birthdayRegex =
      /^(\d{1,2})[\/\-\s](\d{1,2}|[A-Za-z]+)[\/\-\s](\d{4})$/;
    const match = birthday.match(birthdayRegex);

    if (!match) {
      throw new Error(
        `Invalid birthday format: ${birthday}. Use DD/MM/YYYY or similar`
      );
    }

    return birthday;
  }

  validateMaritalStatus(status, field) {
    const validStatuses = [
      "Single",
      "Married",
      "Divorced",
      "Widowed",
      "Separated",
    ];
    if (
      !validStatuses.some((valid) =>
        status.toLowerCase().includes(valid.toLowerCase())
      )
    ) {
      throw new Error(`Invalid marital status: ${status}`);
    }
    return status;
  }

  validateGender(gender, field) {
    const validGenders = ["Male", "Female", "Other", "Prefer not to say"];
    if (
      !validGenders.some((valid) =>
        gender.toLowerCase().includes(valid.toLowerCase())
      )
    ) {
      throw new Error(`Invalid gender: ${gender}`);
    }
    return gender;
  }

  validateAge(age, field) {
    const validAges = [
      "Under 18",
      "18-24",
      "25-34",
      "35-44",
      "45-54",
      "55-64",
      "65+",
      "Adult ( 20 years and above)",
      "Youth (13-35)",
      "Children (Under 13)",
    ];

    if (
      !validAges.some((valid) =>
        age.toLowerCase().includes(valid.toLowerCase())
      )
    ) {
      logger.warn(`Unusual age category: ${age}`);
    }
    return age;
  }

  generateSampleCSV() {
    const sampleData = [
      {
        Title: "Pastor",
        "First Name": "John",
        "Last Name": "Doe",
        "Phone Number": "08012345678",
        "Kingschat Handle": "@johndoe",
        Email: "john@example.com",
        Birthday: "15th March 1985",
        "Marital Status": "Married",
        Gender: "Male",
        Age: "Adult ( 20 years and above)",
        Group: "CE LIMITLESS GROUP",
        "Church Name": "CE Port Harcourt",
        "Cell Name": "Victory Cell",
        "Sub-Teams": "Media, Ushering",
      },
    ];

    return sampleData;
  }
}

module.exports = CSVProcessor;
