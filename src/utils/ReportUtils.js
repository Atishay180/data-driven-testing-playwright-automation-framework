import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

class ReportUtils {
    static async createExcelSheet(folderPath) {
        console.log(`Creating excel report inside: ${folderPath}`);

        const fileName = "ExecutionReport.xlsx";
        const filePath = path.join(folderPath, fileName);

        // 1. Check if the file already exists
        if (fs.existsSync(filePath)) {
            return; // Do nothing if present
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('ExecutionReport');

        // const headers = [
        //     "Test_Case", "Product", "Execution_Type", "Test_Case_Description",
        //     "Expected_Result", "Actual_Result", "Status", "Execution_Date_Time",
        //     "Execution_Duration", "Error_Message", "Policy_Number", "Lead_ID"
        // ];
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

    static async appendTestResult(folderPath, data) {
        const fileName = "ExecutionReport.xlsx";
        const filePath = path.join(folderPath, fileName);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet('ExecutionReport');

        // 1. Capture the new row in a variable
        const newRow = worksheet.addRow([
            data.testCase,
            data.testCaseType,
            data.status,
            new Date().toLocaleString(),
            `${data.duration} mins`,
            data.errorMessage || "",
            data.comments
        ]);

        // 2. Apply Alignment to every cell in this new row
        newRow.eachCell((cell) => {
            cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
            };

            // Optional: Add a border to keep it consistent with the header
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // 3. Save the changes
        await workbook.xlsx.writeFile(filePath);
    }
}

export { ReportUtils };