import fs from 'fs';
import { ReportUtils } from '../utils/ReportUtils.js';

// Playwright error messages contain terminal colour codes; remove them for Excel
const stripAnsi = (text = '') => text.replace(/\u001b\[[0-9;]*m/g, '');

// Excel cells hold max 32,767 characters; keep the message readable
const shorten = (text, max = 1500) => (text.length > max ? `${text.slice(0, max)}...` : text);

/**
 * Writes ExecutionReport.xlsx ONCE, after all tests (and retries) are finished.
 * It runs in Playwright's main process, so parallel workers never fight over the file.
 */
export default class ExcelReporter {

    onBegin(config, suite) {
        this.suite = suite;
    }

    async onEnd() {
        const reportPath = process.env.REPORT_PATH;
        if (!this.suite || !reportPath) return;

        // `npx playwright test --list` calls this reporter too, but nothing ran: write nothing
        if (this.suite.allTests().every((test) => test.results.length === 0)) return;

        const results = this.suite.allTests().map((test) => {
            const attempts = test.results;
            const last = attempts[attempts.length - 1];
            const annotation = (type) => test.annotations.find((a) => a.type === type)?.description ?? '';

            let status;
            let comments = 'NA';
            let errorMessage = '';

            switch (test.outcome()) {
                case 'expected':
                    status = 'PASS';
                    break;
                case 'flaky':
                    status = 'PASS';
                    comments = `Passed after ${attempts.length - 1} retry(ies)`;
                    break;
                case 'unexpected':
                    status = 'FAIL';
                    errorMessage = shorten(stripAnsi(last?.error?.message ?? ''));
                    break;
                case 'skipped':
                    status = 'SKIPPED';
                    break;
                default:
                    status = 'NOT RUN';
            }

            const durationMs = last?.duration ?? 0;
            const executedAt = last ? new Date(last.startTime.getTime() + durationMs) : new Date();

            return {
                testCase: annotation('Test_Case'),
                testCaseType: annotation('TestCaseType'),
                status,
                duration: (durationMs / 60000).toFixed(2),
                errorMessage,
                comments,
                executedAt,
            };
        });

        if (results.length === 0) return;

        fs.mkdirSync(reportPath, { recursive: true });
        await ReportUtils.createExcelSheet(reportPath);
        await ReportUtils.appendTestResults(reportPath, results);
        console.log(`\nExcel report written: ${reportPath}/ExecutionReport.xlsx (${results.length} rows)`);
    }
}