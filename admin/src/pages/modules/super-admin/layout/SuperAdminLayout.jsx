// admin/src/pages/modules/super-admin/layout/SuperAdminLayout.jsx
import DashboardLayout from "../../../../components/layout/DashboardLayout";
import { buildNavGroups } from "../../../../components/layout/navConfig";
import { usePermission } from "../../../../components/hooks/usePermission";

export default function SuperAdminLayout() {
  const { can } = usePermission();
  return <DashboardLayout navGroups={buildNavGroups("/app/super-admin", can)} roleLabel="Super Admin" />;
}