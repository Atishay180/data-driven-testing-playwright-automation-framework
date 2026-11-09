
import { expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { executionContext } from '../RuntimeContext.js';

class CommonUtilities {

    static get runTimeData() {
        return executionContext.getStore().runTimeData;
    }

    /**
     * Get today's date as a string in dd_mm_yyyy format (local timezone).
     * Example: "20_01_2026"
     */
    static getCurrentDate() {
        console.log('[CommonUtilities] Generating current date string (dd_mm_yyyy)...');

        const today = new Date();
        console.log(`[CommonUtilities] System date: ${today.toString()}`);

        let day = today.getDate();
        let month = today.getMonth() + 1; // Months are zero-based (0-11)
        const year = today.getFullYear();

        // Add leading zero if day or month is less than 10
        day = day < 10 ? '0' + day : String(day);
        month = month < 10 ? '0' + month : String(month);

        const formatted = `${day}_${month}_${year}`;
        console.log(`[CommonUtilities] Formatted date: ${formatted}`);
        return formatted;
    }

    /**
     * Create a folder at <basePath>/<folderName>.
     * - Uses sync FS operations (simple & reliable for small utility work).
     * - Returns the absolute path of the created/existing folder.
     *
     * @param {string} folderName - Name of the folder to create.
     * @param {string} [basePath='reports'] - Base path under which the folder will be created.
     * @returns {Promise<string>} Absolute folder path.
     */
    static async createFolder(folderName, basePath = 'reports') {
        console.log(`[CommonUtilities] Requested to create folder: "${folderName}" under base path: "${basePath}"`);

        try {
            if (!folderName || typeof folderName !== 'string') {
                throw new Error('createFolder: "folderName" must be a non-empty string.');
            }

            // Use path.join to keep the path relative to your project folder
            const folderPath = path.join(basePath, folderName);
            console.log(`[CommonUtilities] Relative folder path: ${folderPath}`);

            // Note: fs.existsSync and fs.mkdirSync handle relative paths perfectly
            if (!fs.existsSync(folderPath)) {
                console.log('[CommonUtilities] Folder does not exist. Creating...');
                fs.mkdirSync(folderPath, { recursive: true });
                console.log(`[CommonUtilities] ✅ Folder created at: ${folderPath}`);
            } else {
                console.log(`[CommonUtilities] ℹ️ Folder already exists at: ${folderPath}`);
            }

            // This now returns 'reports/folderName' instead of 'C:/...'
            return folderPath;
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Error creating folder: ${msg}`);
        }
    }

    /**
     * Create a folder at reports/'todaysDate'/TC_'Number'.
     * - Uses sync FS operations (simple & reliable for small utility work).
     * - Returns the absolute path of the created/existing folder.
     *
     * @param {string} testCaseNumber - Test case number.
     * @param {string} [basePath='reports'] - Base path under which the folder will be created.
     * @returns {Promise<string>} Absolute folder path.
     */
    static async createTestCaseFolder(testCaseNumber, basePath) {
        console.log(`[CommonUtilities] Requested to create test case folder...`);

        try {
            const num = Number(testCaseNumber);
            // Standardize folder naming (TC_01, TC_10, etc.)
            const folderName = num <= 9 ? `TC_0${num}` : `TC_${num}`;

            const folderPath = path.join(basePath, folderName);
            console.log(`[CommonUtilities] Relative folder path: ${folderPath}`);

            if (fs.existsSync(folderPath)) {
                console.log('[CommonUtilities] ℹ️ Folder already exists. Clearing contents...');
                // recursive: true + force: true ensures it deletes everything safely
                fs.rmSync(folderPath, { recursive: true, force: true });
            }

            // (Re)create the empty folder
            fs.mkdirSync(folderPath, { recursive: true });
            console.log(`[CommonUtilities] ✅ Folder ready at: ${folderPath}`);

            return folderPath;
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[CommonUtilities] ❌ Error creating folder: ${msg}`);
            throw new Error(`Error creating folder: ${msg}`);
        }
    }

    /**
     * Generate a random string of given length.
     * Example: "KJSDFDSF"
     */
    static getRandomString(length) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    /**
     * Capture and save the screenshot at provided path.
     */
    static async takeScreenshot(page, folderPath, screenshotName, isFullSS = false) {
        console.log(`Capturing SS of ${screenshotName}...`);

        const store = executionContext.getStore();

        const finalName = `${store.screenshotCounter++}_${screenshotName}.jpeg`;

        const finalPath = path.join(folderPath, finalName);

        await page.screenshot({
            path: finalPath,
            type: "jpeg",
            fullPage: isFullSS,
            quality: 90
        });

        console.log(`Screenshot saved at: ${finalPath}`);
        return finalPath;
    }

    /**
     * generate a random upper case alphabets of provided length.
     */
    static generateRandomUppercaseAlphabets(length) {
        if (length <= 0) return '';

        let result = '';
        for (let i = 0; i < length; i++) {
            // 65 is 'A', 65 + 25 is 'Z'
            result += String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
        return result;
    }

    /**
     * generate a random number of provided length.
     */
    static generateRandomDigits(length) {
        let result = '';
        for (let i = 0; i < length; i++) {
            // Generates a single random digit (0-9) and adds it to the string
            result += Math.floor(Math.random() * 10);
        }
        return result;
    }

    /**
     * generate dob from provided age in dd/mm/yyyy format.
     * - Returns the dob in dd/mm/yyyy format.
     *
     * @param {string} age - input age 
     * @returns {string} - dob in dd/mm/yyyy format. 
     */
    static generateDobFromAgeInDDMMYYYY(ageInput) {
        const age = parseInt(ageInput.toString().trim(), 10);
        if (isNaN(age) || age < 0) {
            throw new Error("Please provide a valid non-negative age.");
        }

        const today = new Date();
        const currentYear = today.getFullYear();

        // Set boundary to 30 days in the future
        const restrictionBoundary = new Date();
        restrictionBoundary.setDate(today.getDate() + 30);

        let randomMonth, randomDay, birthYear, generatedDate;
        let isValidDate = false;

        // Loop until the generated date is outside the [today to today+30 days] window
        while (!isValidDate) {
            randomMonth = Math.floor(Math.random() * 12);
            const lastDayOfMonth = new Date(currentYear, randomMonth + 1, 0).getDate();
            randomDay = Math.floor(Math.random() * lastDayOfMonth) + 1;

            // Calculate birth year based on whether the random birthday passed this year
            birthYear = currentYear - age;
            const hasBirthdayPassed = (randomMonth < today.getMonth()) ||
                (randomMonth === today.getMonth() && randomDay <= today.getDate());

            if (!hasBirthdayPassed) {
                birthYear--;
            }

            // Validate the date object against restrictions
            generatedDate = new Date(birthYear, randomMonth, randomDay);
            const isWithinRestrictedWindow = generatedDate >= today && generatedDate <= restrictionBoundary;

            if (!isWithinRestrictedWindow) {
                isValidDate = true;
            }
        }

        // Format output to DD-MM-YYYY
        const yyyy = birthYear;
        const mm = String(randomMonth + 1).padStart(2, '0');
        const dd = String(randomDay).padStart(2, '0');

        return `${dd}/${mm}/${yyyy}`;
    }

    /**
 * Wait until a field is visible and ready for interaction.
 *
 * @param {import('@playwright/test').Locator} fieldLocator
 * @param {string} fieldName
 * @param {number} timeout
 */
    static async waitForField(
        fieldLocator,
        fieldName = 'field',
        timeout = 10000
    ) {
        try {
            await fieldLocator.waitFor({
                state: 'visible',
                timeout
            });

            await expect(fieldLocator).toBeEnabled({
                timeout
            });

            console.log(
                `[CommonUtilities] ${fieldName} is visible and enabled.`
            );
        } catch (error) {
            throw new Error(
                `Field "${fieldName}" was not ready: ${error.message}`
            );
        }
    }

}

export { CommonUtilities };
