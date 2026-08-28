import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  QrCode,
  UtensilsCrossed,
  Wallet,
  Monitor,
  ScanLine,
  Timer,
  ArrowRight,
  Moon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import { DishImage } from "../../components/shared/DishImage";
import { dataStore } from "../../components/services/dataStore";
import { getMealLimitStatus } from "../../components/services/mealLimit";
import logo from "../../assets/logo.jpeg";

const STEPS = [
  {
    Icon: ScanLine,
    title: "Scan your QR",
    text: "Show your card at the counter — the Manager scans it in a second.",
  },
  {
    Icon: UtensilsCrossed,
    title: "Pick your meal",
    text: "Choose from today's fixed menu or the full à la carte list.",
  },
  {
    Icon: Timer,
    title: "Track it live",
    text: "Watch your order move from kitchen to counter in real time.",
  },
  {
    Icon: Wallet,
    title: "Pay without cash",
    text: "Wallet, salary deduction, or company billing — your choice.",
  },
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function Home() {
  const [menu, setMenu] = useState([]);
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [settings, setSettings] = useState(null);
  const [mealStatus, setMealStatus] = useState(null);

  useEffect(() => {
    (async () => {
      setMenu(await dataStore.load("menu", "menu.json"));
      setWeeklyMenu(await dataStore.load("weeklyMenu", "weekly-menu.json"));
      setSettings(await dataStore.load("settings", "settings.json"));
      setMealStatus(await getMealLimitStatus());
    })();

    // Fallback poll — keeps things fresh even if a subscribe event is ever
    // missed (e.g. this tab was backgrounded when it fired).
    const t = setInterval(
      async () => setMealStatus(await getMealLimitStatus()),
      15000,
    );

    // True real-time updates: the Self-Order station code (settings) and
    // the meals-remaining counter (mealLimit) both broadcast the instant
    // they're written elsewhere — same tab via a custom event, other
    // tabs/devices via the "storage" event — so this screen doesn't have
    // to wait for the 15s poll above.
    const unsubSettings = dataStore.subscribe("settings", async () => {
      setSettings(await dataStore.load("settings", "settings.json"));
    });
    const unsubMealLimit = dataStore.subscribe("mealLimit", async () => {
      setMealStatus(await getMealLimitStatus());
    });

    return () => {
      clearInterval(t);
      unsubSettings();
      unsubMealLimit();
    };
  }, []);

  const mealsRemaining = mealStatus
    ? Math.max(0, mealStatus.dailyLimit - mealStatus.served)
    : null;

  const todayName = DAY_NAMES[new Date().getDay()];
  const lunchItems = menu.filter(
    (m) => m.category === "Fixed Meal" || m.category === "Custom Menu",
  );
  const eveningItems = menu.filter(
    (m) => m.category === "Beverage" || m.category === "Evening Snack",
  );

  function menuIdForDish(name) {
    return menu.find((m) => m.name === name)?.id;
  }

  // Duplicate the week twice so the belt loops seamlessly.
  const beltItems = [...weeklyMenu, ...weeklyMenu];

  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="relative min-h-screen w-full overflow-hidden bg-ink-950 text-white">
        {/* Full-screen Background Video */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/videos/hero_bg.webm"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-ink-950/70" />

        {/* Decorative Circles */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full border-[50px] border-ink-800/40" />
        <div className="pointer-events-none absolute -right-16 top-16 h-[350px] w-[350px] rounded-full border-[35px] border-brand-600/30" />

        {/* Full Screen Content */}
        <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] items-center px-6 py-16 sm:px-10 lg:px-16 xl:px-20">
          <div className="grid w-full gap-16 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            {/* LEFT */}
            <div className="max-w-4xl">
              <span className="inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-brand-400 backdrop-blur-md sm:text-base">
                <QrCode size={20} />
                Corporate Cashless Cafeteria
              </span>

              <h1 className="mt-7 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl xl:text-[6.5rem]">
                One QR card.
                <br />
                Every meal, tracked.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-ink-300 sm:text-xl lg:text-2xl">
                Conveyor Group Restaurant's cafeteria runs on a single system:
                scan in, order, watch it cook, and pay without touching cash —
                from your desk to the counter.
              </p>

              <div className="mt-10 flex flex-wrap gap-5">
                <Link
                  to="/login"
                  className="flex items-center gap-3 rounded-xl bg-brand-600 px-8 py-4 text-base font-bold transition-all hover:bg-brand-700 sm:px-10 sm:py-5 sm:text-lg"
                >
                  Sign in to order
                  <ArrowRight size={21} />
                </Link>

                <a
                  href="#weekly-meals"
                  className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-base font-bold backdrop-blur-sm transition-all hover:bg-white/10 sm:px-10 sm:py-5 sm:text-lg"
                >
                  See this week's menu
                </a>
              </div>
            </div>

            {/* RIGHT — QR CARD */}
            <div className="mx-auto flex w-full max-w-md items-center justify-center rounded-[2rem] bg-white/5 p-8 backdrop-blur-md lg:max-w-lg lg:p-10">
              <div className="w-full rounded-3xl bg-white p-8 text-ink-900 shadow-2xl lg:p-10">
                <div className="flex items-center justify-between">
                  <img
                    src={logo}
                    alt="Conveyor Group"
                    className="h-10 w-auto lg:h-12"
                  />

                  <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 lg:text-sm">
                    Demo
                  </span>
                </div>

                <div className="mt-10 flex justify-center">
                  <QRCodeSVG
                    value="CONVEYOR-GROUP-DEMO-EMP-1042"
                    size={190}
                    level="M"
                  />
                </div>

                <p className="mt-7 text-center text-xl font-bold text-ink-700 lg:text-2xl">
                  EMP-1042
                </p>

                <p className="mt-1 text-center text-base text-ink-400 lg:text-lg">
                  Farzana Karim · Finance
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature section: the week's fixed meals, literally riding a conveyor belt */}
      <section id="weekly-meals" className="overflow-hidden bg-ink-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-ink-900">
            This Week, On the Belt
          </h2>

          <p className="mt-1 text-sm text-ink-400">
            Fixed-Meal employees get the day's dish automatically — watch the
            belt roll continuously.
          </p>
        </div>

        {/* Infinite Conveyor */}
        <div className="relative mt-10 w-full overflow-hidden">
          <div className="conveyor-track flex w-max gap-8">
            {/* FIRST SET */}
            {beltItems.map((d, i) => {
              const isToday = d.day === todayName;
              const id = menuIdForDish(d.meal);
              const Wrapper = id ? Link : "div";

              return (
                <Wrapper
                  key={`first-${d.day}-${i}`}
                  to={id ? `/menu/${id}` : undefined}
                  className="flex w-32 shrink-0 flex-col items-center text-center"
                >
                  <div
                    className={`overflow-hidden rounded-full border-4 bg-white shadow-md transition-transform hover:-translate-y-1 ${
                      isToday ? "border-brand-500" : "border-white"
                    }`}
                  >
                    <DishImage
                      name={d.meal}
                      className="h-24 w-24 object-cover"
                      rounded=""
                    />
                  </div>

                  <p
                    className={`mt-2 text-[11px] font-bold uppercase tracking-wide ${
                      isToday ? "text-brand-600" : "text-ink-400"
                    }`}
                  >
                    {d.day} {isToday && "· Today"}
                  </p>

                  <p className="text-xs font-semibold leading-tight text-ink-800">
                    {d.meal}
                  </p>
                </Wrapper>
              );
            })}

            {/* SECOND IDENTICAL SET */}
            {beltItems.map((d, i) => {
              const isToday = d.day === todayName;
              const id = menuIdForDish(d.meal);
              const Wrapper = id ? Link : "div";

              return (
                <Wrapper
                  key={`second-${d.day}-${i}`}
                  to={id ? `/menu/${id}` : undefined}
                  className="flex w-32 shrink-0 flex-col items-center text-center"
                >
                  <div
                    className={`overflow-hidden rounded-full border-4 bg-white shadow-md transition-transform hover:-translate-y-1 ${
                      isToday ? "border-brand-500" : "border-white"
                    }`}
                  >
                    <DishImage
                      name={d.meal}
                      className="h-24 w-24 object-cover"
                      rounded=""
                    />
                  </div>

                  <p
                    className={`mt-2 text-[11px] font-bold uppercase tracking-wide ${
                      isToday ? "text-brand-600" : "text-ink-400"
                    }`}
                  >
                    {d.day} {isToday && "· Today"}
                  </p>

                  <p className="text-xs font-semibold leading-tight text-ink-800">
                    {d.meal}
                  </p>
                </Wrapper>
              );
            })}

            {/* LOADING PLACEHOLDERS */}
            {weeklyMenu.length === 0 &&
              Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={`loading-${i}`}
                  className="h-32 w-32 shrink-0 animate-pulse rounded-full bg-ink-200"
                />
              ))}
          </div>
        </div>

        {/* Conveyor Belt Line */}
        <div className="relative mt-4 h-3 w-full bg-ink-200">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, #eb2a2d 0, #eb2a2d 14px, transparent 14px, transparent 28px)",
              opacity: 0.5,
            }}
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-ink-900">
            How the cafeteria works
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-ink-400">
            Four steps, one system — from a scan at the counter to a paperless
            invoice.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ Icon, title, text }, i) => (
              <div
                key={title}
                className="relative rounded-2xl border border-ink-100 p-6 transition-shadow hover:shadow-md"
              >
                <span className="text-xs font-bold text-brand-500">
                  0{i + 1}
                </span>
                <Icon className="mt-2 text-ink-900" size={28} />
                <h3 className="mt-3 font-semibold text-ink-900">{title}</h3>
                <p className="mt-1 text-sm text-ink-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Self-Order Station */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="grid items-center md:grid-cols-3">
              {/* LEFT — Self Order Information */}
              <div className="px-6 py-10 sm:px-10 md:px-8 lg:px-12">
                <div className="mb-5 inline-flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <QrCode size={24} />
                  </div>

                  <div>
                    <p className="text-lg font-extrabold tracking-tight text-ink-900">
                      Self-Order Station
                    </p>

                    <div className="mt-1 h-1 w-16 rounded-full bg-brand-500" />
                  </div>
                </div>

                <h3 className="text-2xl font-extrabold leading-tight text-ink-900 sm:text-3xl">
                  Skip the wait — scan and go
                </h3>

                <p className="mt-4 max-w-lg text-sm leading-7 text-ink-500 sm:text-base">
                  Fixed-Meal employees: open your dashboard, tap "Scan to
                  Order," and scan this station code. Today's meal is confirmed
                  instantly — no Manager or Kitchen approval, straight to the
                  Token Board.
                </p>
              </div>

              {/* MIDDLE — Meals Remaining */}
              <div className="border-t border-gray-200 px-6 py-10 sm:px-10 md:border-l md:border-t-0 md:px-8 lg:px-12">
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-brand-100 bg-brand-50/40 px-6 text-center">
                  <p className="text-7xl font-black leading-none tracking-tight text-brand-600 sm:text-8xl">
                    {mealsRemaining ?? 300}
                  </p>

                  <div className="mt-7 h-px w-40 bg-brand-300" />

                  <p className="mt-5 text-base font-bold text-ink-900 sm:text-lg">
                    of{" "}
                    <span className="text-brand-600">
                      {mealStatus?.dailyLimit ?? 300}
                    </span>{" "}
                    meals left today
                  </p>
                </div>
              </div>

              {/* RIGHT — QR Code */}
              <div className="flex items-center justify-center border-t border-gray-200 px-6 py-10 sm:px-10 md:border-l md:border-t-0 md:px-8 lg:px-12">
                <div className="flex h-[210px] w-[210px] items-center justify-center rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:h-[230px] sm:w-[230px]">
                  {settings ? (
                    <QRCodeSVG
                      value={settings.selfOrderStationCode}
                      size={175}
                      level="M"
                    />
                  ) : (
                    <div className="h-[175px] w-[175px] animate-pulse rounded-xl bg-gray-100" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live board teaser */}
      <section className="bg-gray-100 py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 md:flex-row md:text-left">
          <Monitor size={48} className="shrink-0 text-brand-600" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-ink-900">
              See who's up next, live
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              Our cafeteria counter runs a live collection board — no more
              guessing when your order will be ready.
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
          Fixed-Meal dishes plus everything Custom-Menu employees and guests can
          order freely. Tap a dish for details.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lunchItems.map((m) => (
            <Link
              key={m.id}
              to={`/menu/${m.id}`}
              className="group overflow-hidden rounded-xl border border-ink-100 transition-shadow hover:shadow-lg"
            >
              <DishImage name={m.name} />
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-ink-900 group-hover:text-brand-600">
                    {m.name}
                  </p>
                  <p className="text-xs text-ink-400">{m.category}</p>
                </div>
                <span className="font-bold text-brand-600">Tk {m.price}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Evening Snacks */}
      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Moon className="text-brand-600" size={22} />
            <h2 className="text-2xl font-bold text-ink-900">
              Evening Snacks & Beverages
            </h2>
          </div>
          <p className="mt-1 text-sm text-ink-400">
            Light bites for the evening shift — self-paid, available to
            everyone.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {eveningItems.map((m) => (
              <Link
                key={m.id}
                to={`/menu/${m.id}`}
                className="group overflow-hidden rounded-xl border border-ink-100 bg-white transition-shadow hover:shadow-lg"
              >
                <DishImage name={m.name} className="h-24" />
                <div className="flex items-center justify-between p-3">
                  <p className="text-sm font-semibold text-ink-900 group-hover:text-brand-600">
                    {m.name}
                  </p>
                  <span className="font-bold text-brand-600">Tk {m.price}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-5 py-2.5 shadow-sm">
          <span className="text-sm text-ink-500">
            Sign in to place an order
          </span>

          <span className="text-ink-300">—</span>

          <Link
            to="/login"
            className="text-sm font-bold text-brand-600 transition-colors duration-200 hover:text-brand-700"
          >
            it takes a second
          </Link>

          <span className="text-brand-400">→</span>
        </div>
      </div>

      <Footer />
    </div>
  );
}
