import { test, request } from "@playwright/test";
import { ExcelUtils } from "../utils/ExcelUtils.js";
import { CommonUtilities } from "../utils/CommonUtilities.js";
import { ReportUtils } from "../utils/ReportUtils.js";
import { executionContext } from "../RuntimeContext.js";

let rows = [];
let globalReportPath = "";

// Replace it with L2I URL
const url = process.env.BASE_URL;

// Replace excel file name
const excelFile = process.env.EXCEL_FILE_NAME;

// Replace sheet name
const sheetName = process.env.SHEET_NAME;


// ---------------------------------------------------------
// BEFORE ALL
// ---------------------------------------------------------

test.beforeAll(async () => {
    rows = await ExcelUtils.readExcelTestData(`data/excel/${excelFile}`, sheetName);
    console.log(`Loaded rows: ${rows.length}`);

    const todaysDate = CommonUtilities.getCurrentDate();
    globalReportPath = await CommonUtilities.createFolder(todaysDate);
    console.log(`Reports folder ready at: ${globalReportPath}`);

    await ReportUtils.createExcelSheet(globalReportPath);
});


// ---------------------------------------------------------
// ACTUAL EXECUTION
// ---------------------------------------------------------

test("Data driven test execution", async ({ browser }) => {

    // -----------------------------------------------------
    // Filter only Executor = Y rows
    // -----------------------------------------------------

    const executableRows = rows.filter(row => row["Executor"]?.toString().trim().toUpperCase() === "Y");


    // -----------------------------------------------------
    // Skip if no rows are marked Y
    // -----------------------------------------------------

    test.skip(executableRows.length === 0, "No executable rows found in Excel where Executor = Y");
    console.log(`Rows selected for execution: ${executableRows.length}`);

    // -----------------------------------------------------
    // Maximum parallel executions
    // -----------------------------------------------------
    // 2 rows will execute at the same time.
    // -----------------------------------------------------

    const MAX_PARALLEL_EXECUTIONS = Number(process.env.MAX_PARALLEL_EXECUTIONS) || 2;

    // -----------------------------------------------------
    // Report writing lock
    // -----------------------------------------------------
    // Multiple parallel executions may finish at the same
    // time. Excel report writing should therefore happen
    // one at a time.
    // -----------------------------------------------------

    let reportWriteChain = Promise.resolve();


    // -----------------------------------------------------
    // Function to execute one Excel row
    // -----------------------------------------------------

    const executeExcelRow = async (args, rowIndex) => {

        await executionContext.run(
            {
                screenshotCounter: 1,
                runTimeData: {}
            },
            async () => {
                const context = await browser.newContext();
                const page = await context.newPage();
                const apiContext = await request.newContext();


                // -------------------------------------------------
                // Row-specific variables
                // -------------------------------------------------

                const startTime = Date.now();

                let status = "PASS";
                let comments = "NA";
                let errorMessage = "";
                let testCaseType = args["TestCaseType"];
                const testScenarioFolderName = args["Test_Scenario_Folder_Name"]?.trim();
                const testCaseNumber = args["Test_Case"]?.trim();
                const executionType = args["Execution_Type"]?.toString().trim().toLowerCase() || "";

                let testScenarioFolder = "";
                let testCaseFolder = "";

                console.log(`\n==================================================`);
                console.log(`Starting Row ${rowIndex + 1}`);
                console.log(`Test Case: ${testCaseNumber}`);
                console.log(`Execution Type: ${executionType}`);
                console.log(`==================================================`);

                try {
                    // -------------------------------------------------
                    // MAIN FOLDER INSIDE TODAY'S DATE FOLDER
                    // -------------------------------------------------

                    testScenarioFolder = await CommonUtilities.createFolder(testScenarioFolderName, globalReportPath);
                    console.log(`Test_Scenario folder ready at: ${testScenarioFolder}`);


                    // -------------------------------------------------
                    // TEST CASE FOLDER
                    // -------------------------------------------------

                    testCaseFolder = await CommonUtilities.createTestCaseFolder(testCaseNumber, testScenarioFolder);
                    console.log(`Test_Case folder ready at: ${testCaseFolder}`);

                    // =================================================
                    // E2E TESTING (Your test code goes here)
                    // =================================================
                    await page.goto(url);

                    await page.locator('summary').filter({ hasText: 'Beacons of Hope Voting (Corp)- 3rd November 2026 (19:00 hrs) – 5th November' }).click();

                    // Capture full screenshot
                    await CommonUtilities.takeScreenshot(page, testCaseFolder, "Test_Case_" + testCaseNumber + "_After_Submit", true);

                    console.log(`Test Case ${testCaseNumber} completed successfully.`);
                }


                // =====================================================
                // ERROR HANDLING
                // =====================================================

                catch (error) {
                    status = "FAIL";
                    errorMessage = error?.message || String(error);
                    console.error(`Test Case ${testCaseNumber} failed: ${errorMessage}`);

                    // -------------------------------------------------
                    // Emergency Screenshot
                    // -------------------------------------------------
                    try {
                        const screenshotDestination = testCaseFolder || globalReportPath;
                        await CommonUtilities.takeScreenshot(page, screenshotDestination, `Test_Case_${testCaseNumber}_Failure`, true);

                    }

                    catch (screenshotErr) {
                        console.error("Failed to capture error screenshot:", screenshotErr?.message || screenshotErr);
                    }
                }

                // =====================================================
                // FINALLY
                // =====================================================

                finally {
                    const durationInMinutes = ((Date.now() - startTime) / 60000).toFixed(2);

                    // -------------------------------------------------
                    // Append result to Excel report
                    // -------------------------------------------------
                    // Report writes are queued so two parallel tests
                    // do not write to the same Excel file simultaneously.
                    // -------------------------------------------------
                    reportWriteChain = reportWriteChain.then(async () => {

                        await ReportUtils.appendTestResult(
                            globalReportPath,
                            {
                                testCase: args["Test_Case"],
                                testCaseType,
                                status,
                                duration: durationInMinutes,
                                errorMessage: errorMessage,
                                comments
                            }
                        );

                    });

                    await reportWriteChain;

                    // -------------------------------------------------
                    // Close API context
                    // -------------------------------------------------

                    try {
                        await apiContext.dispose();
                    } catch (apiError) {
                        console.error(`Failed to close API context for ${testCaseNumber}:`, apiError?.message || apiError);
                    }


                    // -------------------------------------------------
                    // Close browser context
                    // -------------------------------------------------

                    try {
                        await context.close();
                    } catch (contextError) {
                        console.error(`Failed to close browser context for ${testCaseNumber}:`, contextError?.message || contextError);
                    }

                    console.log(`Finished Test Case: ${testCaseNumber}`);
                }

            }
        );
    };


    // =========================================================
    // RUN ROWS WITH MAXIMUM 2 PARALLEL EXECUTIONS
    // =========================================================

    for (let i = 0; i < executableRows.length; i += MAX_PARALLEL_EXECUTIONS) {

        const currentBatch = executableRows.slice(i, i + MAX_PARALLEL_EXECUTIONS);

        console.log(`\n**************************************************`);
        console.log(`Starting parallel batch`);
        console.log(`Rows: ${currentBatch.length}`);
        console.log(`**************************************************`);

        // Run maximum 2 rows simultaneously
        await Promise.all(currentBatch.map((args, batchIndex) => executeExcelRow(args, i + batchIndex)));

        console.log(`Parallel batch completed.`);
    }

});