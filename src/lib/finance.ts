const DEFAULT_FINANCE_SHEET_XLSX_URL =
  "https://docs.google.com/spreadsheets/d/1kxuhSGNjXuYehIA0wQeYlgynwL9Pa2wx8DT5jKIsKHU/export?format=xlsx";

const configuredFinanceUrl = process.env.FINANCE_SHEET_XLSX_URL?.trim();

export const FINANCE_SHEET_XLSX_URL =
  configuredFinanceUrl && /^https?:\/\//i.test(configuredFinanceUrl)
    ? configuredFinanceUrl
    : DEFAULT_FINANCE_SHEET_XLSX_URL;
