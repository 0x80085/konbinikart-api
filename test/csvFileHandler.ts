import * as fs from 'fs';
import * as path from 'path';

interface TranslationData {
  originalWord: string;
  translationResponse: Record<string, any>;
  statusCode: string;
}

export class CsvFileHandler {
  private filePath: string;

  constructor(fileName: string) {
    this.filePath = path.resolve(fileName);
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    if (!fs.existsSync(this.filePath)) {
      // Initialize file with header if it doesn't exist
      fs.writeFileSync(
        this.filePath,
        'original word,translationresponse,statuscode\n',
        'utf8',
      );
    }
  }

  /**
   * Saves data to the file, overwriting existing content.
   */
  saveData(data: TranslationData[]): void {
    const rows = data.map((entry) => this.formatRow(entry));
    const content =
      'original word,translationresponse,statuscode\n' + rows.join('\n') + '\n'; // ensure newline at the end
    fs.writeFileSync(this.filePath, content, 'utf8');
  }

  /**
   * Appends a single data entry to the file.
   */
  appendData(entry: TranslationData): void {
    const row = this.formatRow(entry);
    fs.appendFileSync(this.filePath, row + '\n', 'utf8');
  }

  /**
   * Formats a row for CSV output, escaping special characters.
   */
  private formatRow(entry: TranslationData): string {
    return [
      this.escapeCsv(entry.originalWord),
      this.escapeCsv(this.minifyJson(entry.translationResponse)),
      this.escapeCsv(entry.statusCode),
    ].join(',');
  }

  /**
   * Minifies the JSON object to avoid line breaks or extra spaces.
   */
  private minifyJson(obj: Record<string, any>): string {
    return JSON.stringify(obj).replace(/\n/g, ' ').replace(/\r/g, '');
  }

  /**
   * Escapes a value for CSV to ensure commas, quotes, and newlines don't break the format.
   */
  private escapeCsv(value: string): string {
    // If value contains special characters like commas, quotes, or newlines, wrap it in quotes and escape internal quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      value = value.replace(/"/g, '""'); // Escape internal quotes
      return `"${value}"`; // Wrap in quotes
    }
    return value;
  }
}
