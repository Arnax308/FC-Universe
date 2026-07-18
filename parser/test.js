const fs = require('fs');
const parse = require('fifa-career-save-parser');

async function main() {
  const filePath = process.argv[2];
  console.log(`Parsing ${filePath}...`);
  const buffer = fs.readFileSync(filePath);
  
  const result = parse(buffer);
  
  console.log(Object.keys(result));
  
  // See what tables we got
  if (result.tables) {
     console.log(result.tables.map(t => t.name).slice(0, 20));
  }
}

main().catch(console.error);
