const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser"); // ✅ FIXED IMPORT
const { writeToPath } = require("fast-csv");

const DATA_DIR = path.join(__dirname, "../../data");

function getFilePath(name) {
  return path.join(DATA_DIR, `${name}.csv`);
}

function readCSV(name) {
  return new Promise((resolve) => {
    const file = getFilePath(name);

    if (!fs.existsSync(file)) {
      return resolve([]);
    }

    const rows = [];

    fs.createReadStream(file)
      .pipe(csvParser()) // ✅ FIXED (NO parse())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", (err) => {
        console.error("CSV READ ERROR:", err);
        resolve([]);
      });
  });
}

function writeCSV(name, rows, headers) {
  return new Promise((resolve, reject) => {
    const file = getFilePath(name);

    // ensure folder exists
    fs.mkdirSync(path.dirname(file), { recursive: true });

    writeToPath(file, rows, { headers: headers || true })
      .on("finish", resolve)
      .on("error", (err) => {
        console.error("CSV WRITE ERROR:", err);
        reject(err);
      });
  });
}

async function appendCSV(name, row, headers) {
  const rows = (await readCSV(name)) || [];
  rows.push(row);
  await writeCSV(name, rows, headers);
  return rows.length - 1;
}

async function updateCSVRow(name, index, updates, headers) {
  const rows = await readCSV(name);

  if (rows[index]) {
    rows[index] = { ...rows[index], ...updates };
    await writeCSV(name, rows, headers);
  }

  return rows;
}

module.exports = {
  readCSV,
  writeCSV,
  appendCSV,
  updateCSVRow,
  getFilePath,
};