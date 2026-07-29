import logo from "../assets/logo.jpeg";

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-ink-100 bg-ink-950 text-ink-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <img src={logo} alt="Conveyor Group" className="h-10 w-auto rounded bg-white p-1" />
          <p className="mt-3 max-w-xs text-sm">
            Corporate Cashless Cafeteria & QR Meal Management System for Conveyor Group
            Restaurant.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Cafeteria</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Weekly Menu</li>
            <li>Guest Dining</li>
            <li>Corporate Billing</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Support</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Report a lost QR card</li>
            <li>Contact your Restaurant Manager</li>
            <li>System status</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-800 py-4 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} Conveyor Group Restaurant. All rights reserved.
      </div>
    </footer>
  );
}
