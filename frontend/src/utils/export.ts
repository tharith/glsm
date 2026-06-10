// Utility: export data to Excel (.xlsx) or CSV
// Usage: exportToExcel(data, columns, 'report_name')
//        exportToCSV(data, columns, 'report_name')

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: (val: any) => string;
}

export function exportToCSV(
  data: any[],
  columns: ExportColumn[],
  filename = "export",
) {
  const headers = columns.map((c) => `"${c.header}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = getNestedValue(row, col.key);
        const formatted = col.format ? col.format(val) : (val ?? "");
        return `"${String(formatted).replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

export async function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  filename = "export",
  sheetName = "Sheet1",
) {
  // Dynamically import SheetJS (xlsx) — already in package.json
  const XLSX = await import("xlsx");
  const ws_data = [
    columns.map((c) => c.header),
    ...data.map((row) =>
      columns.map((col) => {
        const val = getNestedValue(row, col.key);
        return col.format ? col.format(val) : (val ?? "");
      }),
    ),
  ];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Set column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width || 20 }));

  // Style header row
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: "1A2744" } } };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Helper: get nested value by dot-notation key
function getNestedValue(obj: any, key: string): any {
  return key
    .split(".")
    .reduce((o, k) => (o && o[k] !== undefined ? o[k] : ""), obj);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Pre-defined column configs ────────────────────────────────
import { format } from "date-fns";
const fmtDate = (d: string) => (d ? format(new Date(d), "dd/MM/yyyy") : "");
const fmtNum = (n: any) => (n !== null && n !== undefined ? String(n) : "");

export const REPORT_COLUMNS = {
  leaveRequests: [
    { header: "Ref#", key: "refNumber", width: 15 },
    { header: "Employee ID", key: "user.employeeId", width: 14 },
    {
      header: "Name (EN)",
      key: "user.firstName",
      width: 16,
      format: (_: any, row?: any) =>
        `${row?.user?.firstName || ""} ${row?.user?.lastName || ""}`,
    },
    {
      header: "ឈ្មោះ",
      key: "user.firstNameKh",
      width: 16,
      format: (_: any, row?: any) =>
        `${row?.user?.firstNameKh || ""} ${row?.user?.lastNameKh || ""}`,
    },
    { header: "Department", key: "user.orgUnit.nameEn", width: 22 },
    { header: "Leave Type", key: "leaveType.nameEn", width: 16 },
    { header: "Start Date", key: "startDate", width: 12, format: fmtDate },
    { header: "End Date", key: "endDate", width: 12, format: fmtDate },
    { header: "Days", key: "totalDays", width: 8, format: fmtNum },
    { header: "Status", key: "status", width: 16 },
    { header: "Submitted", key: "submittedAt", width: 14, format: fmtDate },
    { header: "Reason", key: "reason", width: 30 },
  ] as ExportColumn[],

  leaveBalances: [
    { header: "Employee ID", key: "user.employeeId", width: 14 },
    { header: "Name (EN)", key: "user.firstName", width: 18 },
    { header: "ឈ្មោះ", key: "user.firstNameKh", width: 18 },
    { header: "Department", key: "user.orgUnit.nameEn", width: 22 },
    { header: "Leave Type", key: "leaveType.nameEn", width: 16 },
    { header: "Allocated", key: "allocated", width: 10, format: fmtNum },
    { header: "Used", key: "used", width: 8, format: fmtNum },
    { header: "Pending", key: "pending", width: 10, format: fmtNum },
    { header: "Available", key: "available", width: 10, format: fmtNum },
    { header: "Year", key: "year", width: 8, format: fmtNum },
  ] as ExportColumn[],

  users: [
    { header: "Employee ID", key: "employeeId", width: 14 },
    { header: "First Name", key: "firstName", width: 16 },
    { header: "Last Name", key: "lastName", width: 16 },
    { header: "ឈ្មោះ", key: "firstNameKh", width: 16 },
    { header: "នាម", key: "lastNameKh", width: 16 },
    { header: "Email", key: "email", width: 28 },
    { header: "Phone", key: "phone", width: 14 },
    { header: "Gender", key: "gender", width: 10 },
    { header: "Position", key: "position.nameEn", width: 22 },
    { header: "Org Unit", key: "orgUnit.nameEn", width: 26 },
    { header: "Hire Date", key: "hireDate", width: 12, format: fmtDate },
    { header: "Rank/Grade", key: "currentRankAndGrade", width: 20 },
    {
      header: "Status",
      key: "isActive",
      width: 10,
      format: (v: any) => (v ? "Active" : "Inactive"),
    },
  ] as ExportColumn[],
};
