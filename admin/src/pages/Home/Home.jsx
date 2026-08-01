import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  QrCode,
  UtensilsCrossed,
  Wallet,
  Monitor,
  ScanLine,
  Timer,
  CalendarCheck,
  ArrowRight,
  Moon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import { DishImage } from "../../components/shared/DishImage";
import { dataStore } from "../../components/services/dataStore";
import logo from "../../assets/logo.jpeg";

const STEPS = [
  { Icon: ScanLine, title: "Scan your QR", text: "Show your card at the counter — the Manager scans it in a second." },
  { Icon: UtensilsCrossed, title: "Pick your meal", text: "Choose from today's fixed menu or the full à la carte list." },
  { Icon: Timer, title: "Track it live", text: "Watch your order move from kitchen to counter in real time." },
  { Icon: Wallet, title: "Pay without cash", text: "Wallet, salary deduction, or company billing — your choice." },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Home() {
  const [menu, setMenu] = useState([]);
  const [weeklyMenu, setWeeklyMenu] = useState([]);

  useEffect(() => {
    (async () => {
      setMenu(await dataStore.load("menu", "menu.json"));
      setWeeklyMenu(await dataStore.load("weeklyMenu", "weekly-menu.json"));
    })();
  }, []);

  const todayName = DAY_NAMES[new Date().getDay()];
  const lunchItems = menu.filter((m) => m.category === "Fixed Meal" || m.category === "Custom Menu");
  const eveningItems = menu.filter((m) => m.category === "Beverage" || m.category === "Evening Snack");

  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border-[40px] border-ink-800/40" />
        <div className="pointer-events-none absolute -right-10 top-10 h-64 w-64 rounded-full border-[28px] border-brand-600/30" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-400">
              <QrCode size={14} /> Corporate Cashless Cafeteria
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              One QR card.
              <br />
              Every meal, tracked.
            </h1>
            <p className="mt-4 max-w-md text-ink-300">
              Conveyor Group Restaurant's cafeteria runs on a single system: scan in, order,
              watch it cook, and pay without touching cash — from your desk to the counter.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold hover:bg-brand-700"
              >
                Sign in to order <ArrowRight size={16} />
              </Link>
              <a
                href="#weekly-meals"
                className="flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold hover:bg-white/10"
              >
                See this week's menu
              </a>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-sm items-center justify-center rounded-3xl bg-white/5 p-8 backdrop-blur">
            <div className="w-full rounded-2xl bg-white p-6 text-ink-900 shadow-2xl">
              <div className="flex items-center justify-between">
                <img src={logo} alt="Conveyor Group" className="h-8 w-auto" />
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  ACTIVE
                </span>
              </div>
              <div className="mt-6 flex justify-center">
                <QRCodeSVG value="CONVEYOR-GROUP-DEMO-EMP-1042" size={128} level="M" />
              </div>
              <p className="mt-4 text-center text-sm font-semibold text-ink-700">EMP-1042</p>
              <p className="text-center text-xs text-ink-400">Farzana Karim · Finance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Fixed Meals */}
      <section id="weekly-meals" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-ink-900">This Week's Fixed Meals</h2>
            <p className="mt-1 text-sm text-ink-400">
              Fixed-Meal employees automatically get the day's dish below — no need to choose.
            </p>
          </div>
          <CalendarCheck className="hidden text-ink-300 sm:block" size={28} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          {weeklyMenu.map((d) => {
            const isToday = d.day === todayName;
            return (
              <div
                key={d.day}
                className={`overflow-hidden rounded-xl border transition-transform hover:-translate-y-1 ${
                  isToday ? "border-brand-500 ring-2 ring-brand-100" : "border-ink-100"
                }`}
              >
                <DishImage name={d.meal} className="h-20" />
                <div className="p-3">
                  <p className={`text-xs font-bold uppercase tracking-wide ${isToday ? "text-brand-600" : "text-ink-400"}`}>
                    {d.day} {isToday && "· Today"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{d.meal}</p>
                </div>
              </div>
            );
          })}
          {weeklyMenu.length === 0 &&
            Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-ink-100" />
            ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-ink-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-ink-900">How the cafeteria works</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-ink-400">
            Four steps, one system — from a scan at the counter to a paperless invoice.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ Icon, title, text }, i) => (
              <div key={title} className="relative rounded-2xl border border-ink-100 bg-white p-6">
                <span className="text-xs font-bold text-brand-500">0{i + 1}</span>
                <Icon className="mt-2 text-ink-900" size={28} />
                <h3 className="mt-3 font-semibold text-ink-900">{title}</h3>
                <p className="mt-1 text-sm text-ink-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live board teaser */}
      <section className="py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 md:flex-row md:text-left">
          <Monitor size={48} className="shrink-0 text-brand-600" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-ink-900">See who's up next, live</h3>
            <p className="mt-1 text-sm text-ink-500">
              Our cafeteria counter runs a live collection board — no more guessing when your
              order will be ready.
            </p>
          </div>
          <Link
            to="/kitchen/board"
            className="rounded-lg border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-100"
          >
            View live board
          </Link>
        </div>
      </section>

      {/* Lunch Menu */}
      <section id="menu" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="text-brand-600" size={22} />
          <h2 className="text-2xl font-bold text-ink-900">Lunch Menu</h2>
        </div>
        <p className="mt-1 text-sm text-ink-400">
          Fixed-Meal dishes plus everything Custom-Menu employees and guests can order freely.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lunchItems.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-xl border border-ink-100">
              <DishImage name={m.name} />
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-ink-900">{m.name}</p>
                  <p className="text-xs text-ink-400">{m.category}</p>
                </div>
                <span className="font-bold text-brand-600">Tk {m.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Evening Snacks */}
      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Moon className="text-brand-600" size={22} />
            <h2 className="text-2xl font-bold text-ink-900">Evening Snacks & Beverages</h2>
          </div>
          <p className="mt-1 text-sm text-ink-400">
            Light bites for the evening shift — self-paid, available to everyone.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {eveningItems.map((m) => (
              <div key={m.id} className="overflow-hidden rounded-xl border border-ink-100 bg-white">
                <DishImage name={m.name} className="h-24" />
                <div className="flex items-center justify-between p-3">
                  <p className="text-sm font-semibold text-ink-900">{m.name}</p>
                  <span className="font-bold text-brand-600">Tk {m.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-10 text-center sm:px-6">
        <p className="text-sm text-ink-400">
          Sign in to place an order —{" "}
          <Link to="/login" className="font-semibold text-brand-600">
            it takes a second
          </Link>
          .
        </p>
      </div>

      <Footer />
    </div>
  );
}
