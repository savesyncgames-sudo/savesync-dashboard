// Mapping of page routes to their Google Sheet edit URLs
export const sheetConfig: Record<string, { editUrl: string; sheetName: string }> = {
  "/dashboard/quick-links": {
    editUrl: "https://docs.google.com/spreadsheets/d/1CyxLqzN-dsOE7P3jliaT2xSw0-zb9hBImWlve7dUF0U/edit?gid=873922646#gid=873922646",
    sheetName: "Quick Links",
  },
  // Add more pages here as needed
  // "/dashboard/some-page": {
  //   editUrl: "https://docs.google.com/spreadsheets/d/...",
  //   sheetName: "Sheet Name",
  // },
};

export function getSheetConfig(pathname: string) {
  return sheetConfig[pathname] || null;
}
