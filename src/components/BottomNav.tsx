import { Home, Users, Shield, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", icon: Home, label: "Feed" },
  { path: "/players", icon: Users, label: "Players" },
  { path: "/squads", icon: Shield, label: "Squads" },
  { path: "/chat", icon: MessageCircle, label: "Trial Zone" },
  { path: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border bottom-nav-safe">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-all duration-200 min-w-fit ${isActive ? "text-primary" : "text-muted-foreground"
                }`}
            >
              <tab.icon
                className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_6px_hsl(0,85%,50%)]" : ""}`}
              />
              <span className="text-[9px] font-medium whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
