// admin/src/pages/modules/accounts/AccountsLayout.jsx
import DashboardLayout from "../../../components/layout/DashboardLayout";
import { buildNavGroups } from "../../../components/layout/navConfig";
import { usePermission } from "../../../components/hooks/usePermission";

/**
 * The Accounts role owns kitchen procurement and costing. The sidebar is built
 * from the shared permission-filtered config, so granting an extra duty makes
 * its link appear here without touching this file.
 */
import { useAuth } from "../../../components/hooks/useAuth";

export default function AccountsLayout() {
  const { can } = usePermission();
  const { user } = useAuth();
  return (
    <DashboardLayout
      navGroups={buildNavGroups("/app/accounts", can, user?.role)}
      roleLabel="Accounts"
    />
  );
}