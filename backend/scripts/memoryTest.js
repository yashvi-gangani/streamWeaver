// this script is for the mid project review memory audit
// it makes a big fake csv file and streams it through our transform to prove ram stays low
const fs = require("fs");
const path = require("path");
const CsvToJsonStream = require("../csvToJsonStream");

const testFilePath = path.join(__dirname, "bigTestFile.csv");
const TOTAL_ROWS = 2000000; // 2 million rows, roughly a big file

// step 1, generate a big csv file if it does not already exist
function generateBigFile(callback) {
  console.log("Generating big test csv file, please wait...");
  const writeStream = fs.createWriteStream(testFilePath);
  writeStream.write("firstName,lastName,age,city\n");

  let i = 0;
  function writeMore() {
    let ok = true;
    while (i < TOTAL_ROWS && ok) {
      i++;
      ok = writeStream.write(`user${i},last${i},${20 + (i % 50)},city${i % 100}\n`);
    }
    if (i < TOTAL_ROWS) {
      writeStream.once("drain", writeMore);
    } else {
      writeStream.end();
    }
  }
  writeMore();

  writeStream.on("finish", () => {
    console.log("Big test file generated:", testFilePath);
    callback();
  });
}

// step 2, stream the file and log memory usage every second
function runMemoryTest() {
  console.log("Starting memory audit...");
  let rowsProcessed = 0;

  const interval = setInterval(() => {
    const usedMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    console.log(`RAM used: ${usedMB} MB | Rows processed so far: ${rowsProcessed}`);
  }, 1000);

  const fileStream = fs.createReadStream(testFilePath);
  const csvTransform = new CsvToJsonStream();

  fileStream.pipe(csvTransform);

  csvTransform.on("data", () => {
    rowsProcessed++;
  });

  csvTransform.on("end", () => {
    clearInterval(interval);
    console.log("Memory audit finished. Total rows processed:", rowsProcessed);
    fs.unlink(testFilePath, () => {
      console.log("Test file cleaned up.");
    });
  });
}

// only generate the file if it is not already there
if (fs.existsSync(testFilePath)) {
  runMemoryTest();
} else {
  generateBigFile(runMemoryTest);
}
