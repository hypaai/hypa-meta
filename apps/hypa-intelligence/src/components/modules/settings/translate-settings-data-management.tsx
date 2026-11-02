// @ts-nocheck
import { useSettings } from "@/context/settings-context";
import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDestructiveDialog } from "@/components/ui/confirm-destructive-dialog";

import CardWidth from "../../ui/card-with";
import { Button } from "../../ui/button";

const SettingsDataManagement = () => {
  const { exportSettings, resetLocalAppData } = useSettings();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResettingLocalData, setIsResettingLocalData] = useState(false);

  const handleResetLocalData = async () => {
    setIsResettingLocalData(true);
    try {
      if (resetLocalAppData) {
        await resetLocalAppData();
      } else {
        localStorage.clear();
        window.location.reload();
      }
    } finally {
      setIsResettingLocalData(false);
      setIsResetDialogOpen(false);
    }
  };

  return (
    <>
      <CardWidth>
        <h3 className="text-card-foreground font-semibold text-base lg:text-2xl xl:text-4xl">
          Data Management
        </h3>

        <div className="space-y-6 mt-8">
          {/* Export Settings */}
          <div>
            <h4 className="text-card-foreground font-medium text-base mb-2">
              Export Data
            </h4>
            <p className="text-muted-foreground text-sm mb-4">
              Download your settings and translation history as a JSON file.
            </p>
            <Button
              className="flex items-center gap-2 px-6 py-3"
              variant="outline"
              onClick={exportSettings}
            >
              <Download className="size-4" />
              Export Translation History
            </Button>
          </div>

          {/* Clear Data */}
          <div>
            <h4 className="text-card-foreground font-medium text-base mb-2">
              Reset Local App Data
            </h4>
            <p className="text-muted-foreground text-sm mb-4">
              Reset local settings and clear cached translation history on this
              browser.
            </p>
            <Button
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white border-red-600"
              variant="destructive"
              onClick={() => setIsResetDialogOpen(true)}
            >
              <Trash2 className="size-4" />
              Reset Local App Data
            </Button>
          </div>
        </div>
      </CardWidth>

      <ConfirmDestructiveDialog
        confirmLabel="Reset Local App Data"
        confirmLoading={isResettingLocalData}
        description="This resets local settings and clears local translation history in this browser."
        open={isResetDialogOpen}
        title="Reset Local App Data"
        onConfirm={handleResetLocalData}
        onOpenChange={setIsResetDialogOpen}
      />
    </>
  );
};

export default SettingsDataManagement;
