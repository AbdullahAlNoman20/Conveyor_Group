import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Flame, AlertCircle, Tag, LogIn } from "lucide-react";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import { DishImage } from "../../components/shared/DishImage";
import { dataStore } from "../../components/services/dataStore";
import Loader from "../../components/shared/Loader";

export default function MenuDetail() {
  const { id } = useParams();
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    (async () => setMenu(await dataStore.load("menu", "menu.json")))();
  }, []);

  if (!menu) return <Loader full label="Loading dish details..." />;

  const item = menu.find((m) => m.id === id);

  if (!item) {
    return (
      <div className="min-h-screen bg-white">
        <Nav />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-ink-900">Dish not found</h1>
          <p className="mt-2 text-sm text-ink-500">It may have been removed from the menu.</p>
          <Link to="/#menu" className="mt-6 inline-flex items-center gap-2 text-brand-600 font-semibold">
            <ArrowLeft size={16} /> Back to the menu
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link to="/#menu" className="flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-brand-600">
          <ArrowLeft size={16} /> Back to the menu
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-ink-100">
            <DishImage name={item.name} className="h-72 md:h-full" rounded="" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Tag size={12} /> {item.category}
            </span>
            <h1 className="mt-3 text-3xl font-bold text-ink-900">{item.name}</h1>
            <p className="mt-1 text-2xl font-bold text-brand-600">Tk {item.price}</p>

            <p className="mt-4 leading-relaxed text-ink-600">{item.description}</p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Spice Level" value={item.spiceLevel || "—"} Icon={Flame} />
              <Stat label="Calories" value={item.calories ? `${item.calories} kcal` : "—"} Icon={Flame} />
              <Stat
                label="Allergens"
                value={item.allergens?.length ? item.allergens.join(", ") : "None listed"}
                Icon={AlertCircle}
              />
            </div>

            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <LogIn size={16} /> Sign in to order this
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Stat({ label, value, Icon }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50 p-3">
      <div className="flex items-center gap-1.5 text-ink-400">
        <Icon size={13} />
        <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold capitalize text-ink-800">{value}</p>
    </div>
  );
}
