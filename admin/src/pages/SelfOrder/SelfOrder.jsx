// admin/src/pages/SelfOrder/SelfOrder.jsx
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Utensils, LogIn, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiGet } from "../../components/services/api";
import { createInstantFixedMealOrder } from "../../components/services/selfOrder";
import { buzzOnBlocked } from "../../components/utils/haptics";
import { rememberPendingStation, stationCodeFrom } from "../../components/utils/stationCode";
import logo from "../../assets/logo.jpeg";

/**
 * Opened by scanning the station QR with any phone camera.
 *
 * Nothing is ordered until the employee taps the button, so opening the link
 * again by mistake never places a second order (the server also allows only
 * one meal a day).
 */
export default function SelfOrder() {
  const [params] = useSearchParams();
  const code = stationCodeFrom(params.get("c") || params.get("code") || "");

  const [phase, setPhase] = useState("checking"); // checking | login | staff | ready | placing | done | error
  const [me, setMe] = useState(null);
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let mounted = true;

    if (!code) {
      setPhase("error");
      setMessage("This QR code is not valid. Scan the code at the counter again.");
      return undefined;
    }

    apiGet("/auth/me")
      .then((user) => {
        if (!mounted) return;
        if (!user) {
          rememberPendingStation(code);
          setPhase("login");
        } else if (user.role !== "client") {
          setMe(user);
          setPhase("staff");
        } else {
          setMe(user);
          setPhase("ready");
        }
      })
      .catch(() => {
        if (!mounted) return;
        rememberPendingStation(code);
        setPhase("login");
      });

    return () => {
      mounted = false;
    };
  }, [code]);

  async function placeOrder() {
    setPhase("placing");
    try {
      const result = await createInstantFixedMealOrder({ source: "self_scan", stationCode: code });
      setOrder(result);
      setPhase("done");
    } catch (err) {
      buzzOnBlocked();
      setMessage(err?.message || "Could not place your order. Please try again.");
      setPhase("error");
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-ink-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-6 text-center shadow-sm sm:p-8">
        <img src={logo} alt="Conveyor Group" className="mx-auto h-12 w-auto" />
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-brand-600">
          Self-Order Station
        </p>

        {phase === "checking" && (
          <div className="py-10">
            <Loader2 size={28} className="mx-auto animate-spin text-ink-300" />
          </div>
        )}

        {phase === "login" && (
          <>
            <h1 className="mt-4 text-xl font-bold text-ink-900">Sign in to get your meal</h1>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              After you sign in, you will come back here to confirm.
            </p>
            <Link
              to="/login"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white transition hover:bg-brand-700"
            >
              <LogIn size={18} /> Sign in
            </Link>
          </>
        )}

        {phase === "staff" && (
          <>
            <h1 className="mt-4 text-xl font-bold text-ink-900">This is for employees</h1>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              You are signed in as staff. To serve someone, use Scan QR in your panel.
            </p>
            <Link
              to="/"
              className="mt-6 flex w-full items-center justify-center rounded-xl border border-ink-200 py-3 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
            >
              Go home
            </Link>
          </>
        )}

        {(phase === "ready" || phase === "placing") && (
          <>
            <h1 className="mt-4 text-xl font-bold text-ink-900">
              Hi {me?.name?.split(" ")[0] || "there"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              Tap the button to get today's meal. It goes straight to the counter board.
            </p>
            <button
              type="button"
              onClick={placeOrder}
              disabled={phase === "placing"}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-4 text-base font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {phase === "placing" ? <Loader2 size={18} className="animate-spin" /> : <Utensils size={18} />}
              {phase === "placing" ? "Placing..." : "Get my meal"}
            </button>
          </>
        )}

        {phase === "done" && (
          <>
            <CheckCircle2 size={48} className="mx-auto mt-5 text-emerald-500" />
            <h1 className="mt-3 text-xl font-bold text-ink-900">Order placed</h1>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              Your name is on the board. Collect your meal at the counter.
            </p>
            {order?.id && (
              <p className="mt-4 rounded-xl bg-ink-50 py-3 font-mono text-lg font-bold text-ink-900">
                {order.token || order.id}
              </p>
            )}
            <Link
              to="/app/client"
              className="mt-6 flex w-full items-center justify-center rounded-xl border border-ink-200 py-3 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
            >
              Go to my dashboard
            </Link>
          </>
        )}

        {phase === "error" && (
          <>
            <XCircle size={48} className="mx-auto mt-5 text-brand-500" />
            <h1 className="mt-3 text-xl font-bold text-ink-900">Could not order</h1>
            <p className="mt-2 text-sm leading-6 text-ink-500">{message}</p>
            <Link
              to={me ? "/app/client" : "/"}
              className="mt-6 flex w-full items-center justify-center rounded-xl border border-ink-200 py-3 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
            >
              {me ? "Go to my dashboard" : "Go home"}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}