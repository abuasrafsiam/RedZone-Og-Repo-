import { Home, Users, Shield, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", icon: Home, label: "Feed" },
  { path: "/players", icon: Users, label: "Players" },
  { path: "/squads", icon: Shield, label: "Squads" },
  { path: "/chat", icon: MessageCircle, label: "Chat" },
  { path: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 border-t border-border/80 bottom-nav-safe">
      <div className="flex items-center justify-around h-20 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all duration-200 group relative flex-1`}
            >
              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center">
                <IconComponent
                  className={`w-6 h-6 transition-all duration-200 ${
                    isActive
                      ? "text-primary drop-shadow-[0_0_8px_hsl(0,85%,50%)]"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  fill={isActive ? "currentColor" : "none"}
                  strokeWidth={isActive ? 1.5 : 2}
                />

                {/* Notification Badge on Chat tab */}
                {tab.path === "/chat" && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-lg border border-card">
                    9+
                  </div>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
