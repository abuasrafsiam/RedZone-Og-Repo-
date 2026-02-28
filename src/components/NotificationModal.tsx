import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Notification } from "@/hooks/useNotification";

interface NotificationModalProps {
  notification: Notification | null;
  onDismiss: (id: string) => void;
  isOpen: boolean;
}

const NotificationModal = ({ notification, onDismiss, isOpen }: NotificationModalProps) => {
  // Check isOpen first before validating notification
  if (!isOpen || !notification) return null;

  // Icon selection based on type
  const iconMap = {
    info: <Info className="w-8 h-8 text-blue-400" />,
    success: <CheckCircle className="w-8 h-8 text-green-400" />,
    warning: <AlertTriangle className="w-8 h-8 text-yellow-400" />,
    error: <AlertCircle className="w-8 h-8 text-red-400" />,
  };

  // Priority-based styling
  const priorityStyles = {
    low: "border-l-4 border-blue-500/50",
    normal: "border-l-4 border-primary/50",
    high: "border-l-4 border-orange-500/50",
    urgent: "border-l-4 border-red-500/50",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => onDismiss(notification.id)}
        className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
      />

      {/* Modal */}
      <div
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-96 max-w-[90vw] bg-card rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 ${
          priorityStyles[notification.priority as keyof typeof priorityStyles] || priorityStyles.normal
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => onDismiss(notification.id)}
          className="absolute top-4 right-4 p-2 hover:bg-secondary/60 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
        </button>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            {iconMap[notification.icon_type as keyof typeof iconMap] || iconMap.info}
          </div>

          {/* Title */}
          <h2 className="text-center text-xl font-bold text-foreground">
            {notification.title}
          </h2>

          {/* Message */}
          <p className="text-center text-sm text-muted-foreground leading-relaxed">
            {notification.message}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => onDismiss(notification.id)}
              className="flex-1 px-4 py-2.5 bg-secondary/60 hover:bg-secondary text-foreground font-medium rounded-full transition-colors"
            >
              Close
            </button>

            {notification.action_url && (
              <a
                href={notification.action_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onDismiss(notification.id)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-medium rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all"
              >
                {notification.action_label || "Learn More"}
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationModal;
