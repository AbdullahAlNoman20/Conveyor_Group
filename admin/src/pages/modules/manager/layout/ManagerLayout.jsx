// admin/src/pages/modules/manager/layout/ManagerLayout.jsx
import DashboardLayout from "../../../../components/layout/DashboardLayout";
import { buildNavGroups } from "../../../../components/layout/navConfig";
import { usePermission } from "../../../../components/hooks/usePermission";

/**
 * The sidebar is built from the shared permission-filtered config rather than
 * a hard-coded list, so granting this Manager an extra duty makes its link
 * appear without a code change.
 */
export default function ManagerLayout() {
  const { can } = usePermission();
  return <DashboardLayout navGroups={buildNavGroups("/app/manager", can)} roleLabel="Manager" />;
}