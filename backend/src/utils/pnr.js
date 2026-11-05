// RRS-F-023: PNR generation. A PNR is a 10-digit numeric string.
function generatePnr() {
  const tail = String(Date.now()).slice(-7);
  const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return tail + suffix;
}

module.exports = { generatePnr };
