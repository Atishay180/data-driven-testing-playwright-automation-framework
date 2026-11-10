import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const REPORT_FILE_NAME = "ExecutionReport.xlsx";
const REPORT_SHEET_NAME = "ExecutionReport";

class ReportUtils {
    static async createExcelSheet(folderPath) {
        console.log(`Creating excel report inside: ${folderPath}`);

        const filePath = path.join(folderPath, REPORT_FILE_NAME);

        // 1. Check if the file already exists
        if (fs.existsSync(filePath)) {
            return; // Do nothing if present
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(REPORT_SHEET_NAME);

        const headers = [
            "Test_Case", "TestCaseType", "Status", "Execution_Date_Time",
            "Execution_Duration", "Error_Message", "Comments"
        ];

        // 2. Add header row
        const headerRow = worksheet.addRow(headers);

        // 3. Apply Styling: Black Bold Text + Light Background
        headerRow.eachCell((cell) => {
            cell.font = {
                bold: true,
                color: { argb: 'FF000000' } // Standard Black
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9E1F2' } // Light Shade (Light Steel Blue)
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Set default column widths for better visibility
        worksheet.columns = headers.map(header => ({ header, width: 22 }));

        try {
            await workbook.xlsx.writeFile(filePath);
            console.log(`Report created: ${filePath}...`);
        } catch (error) {
            throw new Error(`Failed to create Excel file: ${error.message}`);
        }
    }

    /**
     * Append ONE result row (kept for backward compatibility).
     */
    static async appendTestResult(folderPath, data) {
        await ReportUtils.appendTestResults(folderPath, [data]);
    }

    /**
     * Append MANY result rows with a single read + a single write.
     * Called once by the Excel reporter at the end of the run.
     *
     * Each item: { testCase, testCaseType, status, duration, errorMessage, comments, executedAt? }
     */
    static async appendTestResults(folderPath, results) {
        const filePath = path.join(folderPath, REPORT_FILE_NAME);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(REPORT_SHEET_NAME);

        for (const data of results) {
            const newRow = worksheet.addRow([
                data.testCase,
                data.testCaseType,
                data.status,
                (data.executedAt ?? new Date()).toLocaleString(),
                `${data.duration} mins`,
                data.errorMessage || "",
                data.comments
            ]);

            newRow.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        }

        await workbook.xlsx.writeFile(filePath);
    }
}

export { ReportUtils };