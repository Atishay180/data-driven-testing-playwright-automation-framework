import { expect, test } from "@playwright/test";
import { ExcelUtils } from "../utils/ExcelUtils.js";
import { CommonUtilities } from "../utils/CommonUtilities.js";

// ---------------------------------------------------------
// SETTINGS (from .env locally, from GitHub Variables in CI)
// ---------------------------------------------------------

const url = process.env.BASE_URL;
const excelFile = process.env.EXCEL_FILE_NAME;
const sheetName = process.env.SHEET_NAME;

// Created once per run in playwright.config.js
const reportPath = process.env.REPORT_PATH;


// ---------------------------------------------------------
// READ EXCEL AT LOAD TIME
// ---------------------------------------------------------
// Playwright must know the full list of tests BEFORE any test starts,
// so the Excel file is read here (top-level await), not inside a test or beforeAll.

const allRows = await ExcelUtils.readExcelTestData(`data/excel/${excelFile}`, sheetName);

// Same filter as before: only rows where Executor = Y or Executor = YES
const rows = allRows.filter(row => row["Executor"]?.toString().trim().toUpperCase() === "Y" || row["Executor"]?.toString().trim().toUpperCase() === "YES");
console.log(`Rows selected for execution: ${rows.length}`);

// Test_Case must be unique inside a scenario (it decides the folder name and test title)
const seen = new Set();
for (const row of rows) {
    const key = `${row["Test_Scenario_Folder_Name"]}|${row["Test_Case"]}`;
    if (seen.has(key)) {
        throw new Error(
            `Duplicate Test_Case "${row["Test_Case"]}" in scenario "${row["Test_Scenario_Folder_Name"]}". ` +
            `Each Test_Case must be unique within a scenario.`
        );
    }
    seen.add(key);
}


// ---------------------------------------------------------
// ONE TEST PER EXCEL ROW
// ---------------------------------------------------------

test.describe("Data driven test execution", () => {

    // Runs before EVERY test (and every retry): screenshot counter back to 1, runTimeData emptied
    test.beforeEach(() => {
        CommonUtilities.resetTestState();
    });

    // Skip (not fail) if no rows are marked Y
    if (rows.length === 0) {
        test("No executable rows found", () => {
            test.skip(true, "No executable rows found in Excel where Executor = Y");
        });
        return;
    }

    for (const row of rows) {

        const testScenarioFolderName = row["Test_Scenario_Folder_Name"]?.trim();
        const testCaseNumber = row["Test_Case"]?.trim();
        const executionType = row["Execution_Type"]?.toString().trim().toLowerCase() || "";

        // 'annotation' is read later by ExcelReporter to fill the Excel report
        test(
            `${testScenarioFolderName} | TC ${testCaseNumber}`,
            {
                annotation: [
                    { type: "Test_Case", description: testCaseNumber },
                    { type: "TestCaseType", description: row["TestCaseType"] ?? "" },
                ],
            },
            // 'page' and 'request' are Playwright's built-in fixtures: created before the test,
            // closed automatically after it, and they respect baseURL/trace/screenshot from the config.
            async ({ page, request: apiContext }) => {

                console.log(`\n==================================================`);
                console.log(`Starting: ${testScenarioFolderName} | Test Case: ${testCaseNumber}`);
                console.log(`Execution Type: ${executionType}`);
                console.log(`==================================================`);

                // -------------------------------------------------
                // Evidence folders: reports/<date>/<scenario>/TC_xx
                // -------------------------------------------------
                const testScenarioFolder = await CommonUtilities.createFolder(testScenarioFolderName, reportPath);
                const testCaseFolder = await CommonUtilities.createTestCaseFolder(testCaseNumber, testScenarioFolder);

                try {
                    // =================================================
                    // E2E TESTING (Your test code goes here)
                    // 'row' = this Excel row, 'apiContext' = API request helper
                    // =================================================
                    await page.goto(url);

                    await page.locator('summary').filter({ hasText: 'Beacons of Hope Voting (Corp)- 3rd November 2026 (19:00 hrs) – 5th November' }).click();

                    await CommonUtilities.takeScreenshot(page, testCaseFolder, "Test_Case_" + testCaseNumber + "_After_Submit", true);
                    await expect(page.locator('summary').filter({ hasText: 'Hello world' })).toBeVisible();
                    await CommonUtilities.takeScreenshot(page, testCaseFolder, "Test_Case_" + testCaseNumber + "_After_Submit", true);

                    console.log(`Test Case ${testCaseNumber} completed successfully.`);
                }
                catch (error) {
                    // Emergency screenshot into the test case folder, then RE-THROW
                    // so Playwright marks this row as failed (no more silent failures).
                    console.error(`Test Case ${testCaseNumber} failed: ${error?.message || error}`);
                    try {
                        await CommonUtilities.takeScreenshot(page, testCaseFolder, `Test_Case_${testCaseNumber}_Failure`, true);
                    } catch (screenshotErr) {
                        console.error("Failed to capture error screenshot:", screenshotErr?.message || screenshotErr);
                    }
                    throw error;
                }
            }
        );
    }
});