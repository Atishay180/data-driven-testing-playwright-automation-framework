import ExcelJS from 'exceljs';

class ExcelUtils {
    static async readExcelTestData(filePath, sheetName) {
        const dataList = [];

        try {
            console.log(`Opening Excel File: ${filePath}`);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);

            const sheet = workbook.getWorksheet(sheetName);

            if (!sheet) {
                throw new Error(`Sheet ${sheetName} not found in Excel file.`);
            }

            console.log(`Reading sheet: ${sheetName}`);

            let headerRow = null;
            let headerRowIndex = -1;
            let executerColIndex = -1;

            //identifying header row & executer column dynamically
            sheet.eachRow((row, rowNumber) => {
                if (headerRow) return;

                row.eachCell((cell, colNumber) => {
                    if (cell?.value && cell.value.toString().trim().toLowerCase() === "executor") {
                        headerRow = row;
                        headerRowIndex = rowNumber;
                        executerColIndex = colNumber;
                        console.log(`Found header row at index: ${headerRowIndex}, Executor column index: ${executerColIndex}`);
                    }
                })
            })

            if (!headerRow || executerColIndex === -1) {
                throw new Error(`No header row with 'Executor' column found in sheet: ${sheetName}`);
            }

            const colCount = headerRow.cellCount;
            console.log("Extracting data rows...");

            //Iterate data rows
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber <= headerRowIndex) return;

                const executorCell = row.getCell(executerColIndex);
                const executerValue = executorCell?.value?.toString().trim().toLowerCase();

                if (!(executerValue === "y" || executerValue === "yes")) {
                    console.log(`Skipping row ${rowNumber} (Executor = No/Blank)`);
                    return;
                }

                const rowData = {};

                for (let col = 1; col <= colCount; col++) {
                    const headerCell = headerRow.getCell(col);
                    if (!headerCell?.value) continue;

                    const header = headerCell.value.toString().trim();
                    const cell = row.getCell(col);

                    let value = cell?.value;

                    // Handle Hyperlinks/Emails
                    if (value && value.text) value = value.text;

                    // Handle Formulas
                    if (value && value.result !== undefined) value = value.result;

                    // Final Cleanup
                    const finalValue = (value !== undefined && value !== null) ? value.toString().trim() : "";

                    rowData[header] = finalValue; // Use the cleaned string
                }

                dataList.push(rowData);
            });

            console.log(`Total executable rows extracted: ${dataList.length}`);
            return dataList;

        } catch (error) {
            throw new Error(`Error while reading Excel data: ${error.message}`);
        }

    }
}

export { ExcelUtils };

