import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { expenseService } from '@/features/expenses/expenseService';
import type { ExpenseFilters } from '@/types/filters';
import { formatDisplayDate } from '@/utils/dates';
import { formatInr } from '@/utils/money';
import { UserFacingError } from '@/utils/userError';

function escapeHtml(value?: string | number | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function row(label: string, value?: string | null): string {
  if (!value) {
    return '';
  }
  return `<p><strong>${escapeHtml(label)}</strong><br/>${escapeHtml(value)}</p>`;
}

function documentHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="font-family: sans-serif; padding: 24px; color: #17211D;">
    ${body}
  </body>
</html>`;
}

async function sharePdf(html: string, fileName: string): Promise<void> {
  const printed = await Print.printToFileAsync({ html });
  if (!printed?.uri) {
    throw new UserFacingError("The PDF couldn't be created.");
  }

  const cache = FileSystem.cacheDirectory;
  const dest = cache ? `${cache}${fileName}` : printed.uri;
  if (cache) {
    const existing = await FileSystem.getInfoAsync(dest);
    if (existing.exists) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    }
    await FileSystem.copyAsync({ from: printed.uri, to: dest });
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Export PDF',
    });
    return;
  }

  await Print.printAsync({ uri: dest });
}

export const pdfService = {
  async shareExpense(expenseId: string): Promise<void> {
    const expense = await expenseService.getById(expenseId);
    if (!expense) {
      throw new UserFacingError("That expense couldn't be found.");
    }
    const html = documentHtml(`
      <h1>Expense</h1>
      <hr />
      ${row('Expense ID', expense.expenseId)}
      ${row('Date', formatDisplayDate(expense.expenseDate))}
      ${row('Amount', formatInr(expense.amount))}
      ${row('Category', expense.categoryName)}
      ${row('Subcategory', expense.subCategoryName)}
      ${row('Payment method', expense.paymentMethod)}
      ${row('GST', expense.gstRate !== null ? `${expense.gstRate}% · ${formatInr(expense.gstAmount ?? 0)}` : null)}
      ${row('Description', expense.description)}
      ${row('Bill number', expense.billNumber)}
    `);
    await sharePdf(html, `expense-${expense.expenseId}.pdf`);
  },

  async shareReport(filters: ExpenseFilters, search?: string): Promise<void> {
    const expenses = await expenseService.list(filters, search);
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    const period = [filters.dateFrom, filters.dateTo].filter(Boolean).join(' to ') || 'All dates';
    const rows = expenses
      .map(
        (item) =>
          `<tr>
            <td>${escapeHtml(item.expenseId)}</td>
            <td>${escapeHtml(formatDisplayDate(item.expenseDate))}</td>
            <td>${escapeHtml(item.categoryName)}</td>
            <td>${escapeHtml(formatInr(item.amount))}</td>
          </tr>`,
      )
      .join('');

    const html = documentHtml(`
      <h1>Expense report</h1>
      ${row('Period', period)}
      ${row('Total expenses', formatInr(total))}
      ${row('Number of expenses', String(expenses.length))}
      <table width="100%" cellpadding="6" style="border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr style="background: #EEF2F0; text-align: left;">
            <th>Expense ID</th><th>Date</th><th>Category</th><th>Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `);
    await sharePdf(html, 'expense-report.pdf');
  },
};
