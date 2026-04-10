import * as xlsx from 'xlsx';
import fs from 'fs';

const filePath = 'C:\\Users\\meno0\\Downloads\\CRM_Merino.xlsx';

async function readExcel() {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    
    const sheet = workbook.Sheets['Hoja1'];
    console.log('Sheet !ref:', sheet['!ref']);
    
    // Let's try to get ALL rows regardless of what SheetJS thinks is the range
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });
    console.log('Total rows found with range 0:', data.length);
    
    data.forEach((row, i) => {
      if (row.length > 0 && row.some(c => c !== '')) {
        console.log(`[${i}] ${JSON.stringify(row)}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

readExcel();
