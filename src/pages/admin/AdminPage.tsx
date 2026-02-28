import { useState } from "react";
import AdminLogin from "./AdminLogin";
import AdminLayout from "./AdminLayout";

const ADMIN_KEY = "rz_admin_id";

const AdminPage = () => {
    const [adminId, setAdminId] = useState<string | null>(() => sessionStorage.getItem(ADMIN_KEY));

    const handleLogin = (id: string) => {
        sessionStorage.setItem(ADMIN_KEY, id);
        setAdminId(id);
    };

    const handleLogout = () => {
        sessionStorage.removeItem(ADMIN_KEY);
        setAdminId(null);
    };

    if (!adminId) return <AdminLogin onLogin={handleLogin} />;
    return <AdminLayout adminId={adminId} onLogout={handleLogout} />;
};

export default AdminPage;
