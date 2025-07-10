import { google } from 'googleapis';
import path from 'path';

// This uses the credentials.json file you should place in your project root
const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Writes lead data to the configured Google Sheet after call completion.
 * @param {object} data - The structured lead data object from the call.
 */
async function logLeadData(data) {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        console.error("🔴 Error: GOOGLE_SHEET_ID is not set in your .env file.");
        return;
    }

    // This array order MUST EXACTLY match your Google Sheet headers
    // Expected headers: Call Timestamp, Phone Number, Call Status, Data Status, DNC Request, Recording URL,
    // Full Name, Current Address, Previous Address, Email, DOB, SSN Last 4, Internet Plan, Install Date/Time, Payment Info
    const rowData = [
        data.callMetadata?.callTimestamp || new Date().toISOString(),
        data.customerInfo?.customerPhone || '',
        data.callMetadata?.callStatus || 'Unknown',
        data.callMetadata?.dataStatus || 'Incomplete', 
        data.callMetadata?.dncRequest || 'No',
        data.callMetadata?.recordingUrl || '',
        data.customerInfo?.fullName || '',
        data.customerInfo?.currentAddress || '',
        data.customerInfo?.previousAddress || '',
        data.customerInfo?.email || '',
        data.customerInfo?.dob || '',
        data.customerInfo?.ssn || '',
        data.orderInfo?.selectedPlan || '',
        data.orderInfo?.installDateTime || '',
        data.orderInfo?.paymentInfo || '',
        data.callMetadata?.qualified || 'No',
        data.callMetadata?.appointmentScheduled || 'No',
        data.callMetadata?.dataCompletenessScore || '0%'
    ];

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A1', // Appends to the first empty row of Sheet1
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData],
            },
        });
        console.log('✅ Successfully logged lead data to Google Sheet.');
    } catch (error) {
        console.error('🔴 Error writing to Google Sheets:', error.message);
    }
}

/**
 * Creates headers in the Google Sheet if they don't exist
 */
async function initializeGoogleSheet() {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        console.error("🔴 Error: GOOGLE_SHEET_ID is not set in your .env file.");
        return;
    }

    const headers = [
        'Call Timestamp',
        'Phone Number', 
        'Call Status',
        'Data Status',
        'DNC Request',
        'Recording URL',
        'Full Name',
        'Current Address',
        'Previous Address',
        'Email',
        'Date of Birth',
        'SSN Last 4',
        'Internet Plan',
        'Install Date/Time',
        'Payment Info',
        'Qualified Lead',
        'Appointment Scheduled',
        'Data Completeness'
    ];

    try {
        // Check if headers already exist
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A1:R1',
        });

        if (!response.data.values || response.data.values.length === 0) {
            // Headers don't exist, create them
            await sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: 'Sheet1!A1:R1',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [headers],
                },
            });
            console.log('✅ Google Sheet headers initialized.');
        }
    } catch (error) {
        console.error('🔴 Error initializing Google Sheet:', error.message);
    }
}

export { logLeadData, initializeGoogleSheet };
