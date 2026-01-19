// Mapping of page routes to their Google Sheet edit URLs
export const sheetConfig: Record<string, { editUrl: string; sheetName: string }> = {
  "/dashboard/quick-links": {
    editUrl: "https://docs.google.com/spreadsheets/d/1CyxLqzN-dsOE7P3jliaT2xSw0-zb9hBImWlve7dUF0U/edit?gid=873922646#gid=873922646",
    sheetName: "Quick Links",
  },
  "/dashboard/admin-users": {
    editUrl: "https://docs.google.com/spreadsheets/d/1CyxLqzN-dsOE7P3jliaT2xSw0-zb9hBImWlve7dUF0U/edit?gid=0#gid=0",
    sheetName: "Admin Users",
  },
  "/dashboard/supported-games": {
    editUrl: "https://docs.google.com/spreadsheets/d/1NKitYr1OHQmJQ1XC57HTyd8w2Da9PSkVSYgHWhLTu1Q/edit?gid=335410452#gid=335410452",
    sheetName: "Supported Games",
  },
};

export function getSheetConfig(pathname: string) {
  return sheetConfig[pathname] || null;
}
