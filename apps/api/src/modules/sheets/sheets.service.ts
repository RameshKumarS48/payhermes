import { google } from 'googleapis';

interface SheetCredentials {
  clientEmail: string;
  privateKey: string;
}

export class SheetsService {
  private getAuth(creds: SheetCredentials) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.clientEmail,
        private_key: creds.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  private getSheets(creds: SheetCredentials) {
    return google.sheets({ version: 'v4', auth: this.getAuth(creds) });
  }

  async readRange(
    creds: SheetCredentials,
    spreadsheetId: string,
    range: string,
  ): Promise<string[][]> {
    const sheets = this.getSheets(creds);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return (response.data.values as string[][]) || [];
  }

  async writeRange(
    creds: SheetCredentials,
    spreadsheetId: string,
    range: string,
    values: string[][],
  ): Promise<void> {
    const sheets = this.getSheets(creds);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  async appendRows(
    creds: SheetCredentials,
    spreadsheetId: string,
    range: string,
    values: string[][],
  ): Promise<void> {
    const sheets = this.getSheets(creds);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  async lookupByKey(
    creds: SheetCredentials,
    spreadsheetId: string,
    range: string,
    keyColumn: number,
    keyValue: string,
  ): Promise<string[] | null> {
    const rows = await this.readRange(creds, spreadsheetId, range);
    for (const row of rows) {
      if (row[keyColumn] === keyValue) {
        return row;
      }
    }
    return null;
  }

  async logCallToSheet(
    creds: SheetCredentials,
    spreadsheetId: string,
    sheetName: string,
    callData: {
      date: string;
      time: string;
      phone: string;
      intent: string;
      confidence: string;
      response: string;
      duration: string;
      escalation: string;
      paymentStatus: string;
      notes: string;
    },
  ): Promise<void> {
    const values = [
      [
        callData.date,
        callData.time,
        callData.phone,
        callData.intent,
        callData.confidence,
        callData.response,
        callData.duration,
        callData.escalation,
        callData.paymentStatus,
        callData.notes,
      ],
    ];
    await this.appendRows(creds, spreadsheetId, `${sheetName}!A:J`, values);
  }
}
