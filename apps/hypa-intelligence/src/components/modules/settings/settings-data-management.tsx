import { Download, Trash2 } from "@/lucide-compat";

import CardWidth from "./card-width";

const SettingsDataManagement = () => {
  const handleExport = () => {
    const data = {
      theme: localStorage.getItem("hypa-intelligence-theme") || "system",
      defaultLanguage:
        localStorage.getItem("hypa-intelligence-default-language") ||
        "Auto-Detect",
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "hypa-intelligence-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm("This will clear all local data. Continue?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <CardWidth>
      <h3 className="font-semibold text-base lg:text-2xl xl:text-4xl">
        Data Management
      </h3>

      <div className="space-y-6 mt-8">
        <div>
          <h4 className="font-medium text-base mb-2">Export Data</h4>
          <p className="text-[var(--muted-foreground)] text-sm mb-4">
            Download your settings as a JSON file.
          </p>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-[var(--input)] bg-[var(--background)] px-6 py-3 text-sm font-medium transition-colors hover:bg-[var(--accent)]"
            onClick={handleExport}
          >
            <Download className="size-4" />
            Export Settings
          </button>
        </div>

        <div>
          <h4 className="font-medium text-base mb-2">Reset Application</h4>
          <p className="text-[var(--muted-foreground)] text-sm mb-4">
            This will permanently delete all your local settings and data. This
            action cannot be undone.
          </p>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
            onClick={handleClear}
          >
            <Trash2 className="size-4" />
            Clear All Data
          </button>
        </div>
      </div>
    </CardWidth>
  );
};

export default SettingsDataManagement;
