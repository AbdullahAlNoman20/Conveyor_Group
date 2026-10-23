// admin/src/pages/modules/super-admin/layout/SuperAdminLayout.jsx
import DashboardLayout from "../../../../components/layout/DashboardLayout";
import { buildNavGroups } from "../../../../components/layout/navConfig";
import { usePermission } from "../../../../components/hooks/usePermission";

import { useAuth } from "../../../../components/hooks/useAuth";

export default function SuperAdminLayout() {
  const { can } = usePermission();
  const { user } = useAuth();
  return (
    <DashboardLayout
      navGroups={buildNavGroups("/app/super-admin", can, user?.role)}
      roleLabel="Super Admin"
    />
  );
}