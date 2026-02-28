import { Download, X } from "lucide-react";
import { AppVersion } from "@/hooks/useAppVersion";

interface UpdateModalProps {
  version: AppVersion | null;
  isOpen: boolean;
  onDismiss: () => void;
  forceUpdate: boolean;
}

const UpdateModal = ({ version, isOpen, onDismiss, forceUpdate }: UpdateModalProps) => {
  if (!version || !isOpen) return null;

  const handleUpdate = () => {
    window.open(version.download_url, "_blank");
    if (!forceUpdate) {
      onDismiss();
    }
  };

  return (
    <>
      {/* Backdrop - not dismissible if force update */}
      <div
        onClick={() => !forceUpdate && onDismiss()}
        className={`fixed inset-0 z-40 animate-in fade-in duration-200 ${
          forceUpdate ? "bg-black/60 cursor-not-allowed" : "bg-black/40 cursor-pointer"
        }`}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-96 max-w-[90vw] bg-card rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Close Button - hidden if force update */}
        {!forceUpdate && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 hover:bg-secondary/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          </button>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg">
              <Download className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              {forceUpdate ? "Important Update Required" : "New Update Available"}
            </h2>
            <p className="text-xs text-muted-foreground/70">
              Version {version.version_name} (Build {version.version_code})
            </p>
          </div>

          {/* Update Message */}
          <div className="bg-secondary/30 rounded-xl p-4 min-h-20 flex items-center">
            <p className="text-sm text-foreground leading-relaxed">
              {version.update_message}
            </p>
          </div>

          {/* Warning if force update */}
          {forceUpdate && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-xs text-red-400 font-medium">
                ⚠️ This is a required update. Please update to continue using the app.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            {!forceUpdate && (
              <button
                onClick={onDismiss}
                className="flex-1 px-4 py-2.5 bg-secondary/60 hover:bg-secondary text-foreground font-medium rounded-full transition-colors"
              >
                Update Later
              </button>
            )}

            <a
              href={version.download_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (!forceUpdate) {
                  onDismiss();
                }
              }}
              className={`flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-medium rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 ${
                forceUpdate ? "cursor-pointer" : ""
              }`}
            >
              <Download className="w-4 h-4" />
              Update Now
            </a>
          </div>

          {/* Info Text */}
          <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
            {forceUpdate
              ? "You must update the app to continue. You will be redirected to the download page."
              : "You can update later, but we recommend updating for the best experience."}
          </p>
        </div>
      </div>
    </>
  );
};

export default UpdateModal;
