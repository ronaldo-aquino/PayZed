"use client";

type InvoiceType = "one-time" | "recurring";

interface TypeSelectorProps {
  selectedType: InvoiceType;
  onTypeChange: (type: InvoiceType) => void;
}

export function TypeSelector({ selectedType, onTypeChange }: TypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4 p-1 bg-muted/50 rounded-lg border-2 border-border/60">
      <button
        type="button"
        onClick={() => onTypeChange("one-time")}
        className={`px-6 py-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
          selectedType === "one-time"
            ? "bg-background text-primary shadow-md border-2 border-primary/30"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        }`}
      >
        <div className="flex flex-col items-center space-y-2">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>One-time Payment</span>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onTypeChange("recurring")}
        className={`px-6 py-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
          selectedType === "recurring"
            ? "bg-background text-primary shadow-md border-2 border-primary/30"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        }`}
      >
        <div className="flex flex-col items-center space-y-2">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Recurring Subscription</span>
        </div>
      </button>
    </div>
  );
}




