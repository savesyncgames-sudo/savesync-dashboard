"use client";

import { Button } from "@/components/ui/button";

interface Document {
  name: string;
  description: string;
  url: string;
  category: string;
  type: "file" | "folder";
  password?: string;
}

const DOCUMENTS: Document[] = [
  {
    name: "TAN Document",
    description: "Tax Deduction Account Number",
    url: "https://drive.google.com/file/d/1GOv7SoW-9EmBDILIAx1GfUOb5iDQYYu4/view?usp=sharing",
    category: "Legal",
    type: "file",
    password: "411014",
  },
  {
    name: "PAN",
    description: "Permanent Account Number",
    url: "https://drive.google.com/file/d/1mMWlje6vynmBl4O-khUYBaY4vqdV_aTF/view?usp=drive_link",
    category: "Legal",
    type: "file",
    password: "1512025",
  },
  {
    name: "Certificate of Incorporation",
    description: "Company incorporation certificate",
    url: "https://drive.google.com/file/d/1NIrdZfPx8oij8zluvq2tdZdeBA3-mCNC/view?usp=drive_link",
    category: "Legal",
    type: "file",
  },
  {
    name: "Seema Batra",
    description: "Personal documents",
    url: "https://drive.google.com/drive/folders/1SJyYOtNbfF3kwPus-gLVFjHJV6NpeRKV?usp=sharing",
    category: "Team",
    type: "folder",
  },
  {
    name: "Sharmila Pradeep Gaonkar",
    description: "Personal documents",
    url: "https://drive.google.com/drive/folders/14WbQUbVB1iMCkIRO-n6ua7Oo1F0eoenZ?usp=sharing",
    category: "Team",
    type: "folder",
  },
  {
    name: "Office Documents",
    description: "Office related documents",
    url: "https://drive.google.com/drive/folders/1_S4xUn3_RUnL4CAw_bY3LntIhYqnti-f?usp=drive_link",
    category: "Office",
    type: "folder",
  },
];

export default function DocumentsPage() {
  const categories = [...new Set(DOCUMENTS.map((d) => d.category))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Important company documents stored in Google Drive
        </p>
      </div>

      {categories.map((category) => (
        <div key={category} className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">{category}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DOCUMENTS.filter((d) => d.category === category).map((doc) => (
              <div
                key={doc.name}
                className="rounded-lg border border-border p-4 space-y-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${doc.type === "folder" ? "bg-yellow-500/20" : "bg-blue-500/20"}`}>
                    {doc.type === "folder" ? (
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{doc.name}</h3>
                    <p className="text-xs text-muted-foreground">{doc.description}</p>
                    {doc.password && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Password: <span className="font-mono text-foreground">{doc.password}</span>
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {doc.type === "folder" ? "Open Folder" : "Open Document"}
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
