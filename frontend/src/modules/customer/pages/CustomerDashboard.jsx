import { QuotationOverview } from "../../quotations/QuotationPages";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarHeart,
  ShoppingBag,
  FileText,
  Heart,
  Wallet,
  ArrowUpRight,
  Plus,
  CalendarDays,
  MapPin,
  Users,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  useCustomerData,
  ErrorView,
  Empty,
  Badge,
} from "../components/WorkspaceUI";
import { ServiceCard } from "../components/ServiceCards";
import { date, money } from "../services/workspace.api";
const categorySections = [
  ["Popular venues", "Venue & Location"],
  ["Best caterers", "Catering & Food"],
  ["Dream-worthy decoration", "Decoration"],
  ["Set the mood with a DJ", "DJ & Entertainment"],
  ["Capture every moment", "Photography & Videography"],
  ["Your perfect makeup artist", "Makeup & Beauty"],
  ["Beautiful mehndi", "Mehndi"],
  ["Arrive in style", "Transportation"],
];
function Recommendation({ title, category, id }) {
  const r = useCustomerData(`/discover?category=${id}&pageSize=4`);
  return (
    <section className="cw-recommendation">
      <header>
        <div>
          <span className="cw-eyebrow">CURATED FOR YOUR CELEBRATION</span>
          <h2>{title}</h2>
        </div>
        <Link to={`/customer/discover?category=${id}`}>
          View all <ArrowRight size={15} />
        </Link>
      </header>
      {r.loading ? (
        <div
          className="cw-card-skeletons"
          role="status"
          aria-label={`Loading ${title}`}
        >
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="cw-skeleton cw-card-skeleton" />
          ))}
        </div>
      ) : r.error ? (
        <ErrorView error={r.error} retry={r.retry} />
      ) : !r.data.rows.length ? (
        <div className="cw-category-empty">
          <Sparkles size={20} />
          <div>
            <strong>{category}</strong>
            <p>New services will appear here as vendors are approved.</p>
          </div>
          <Link to="/customer/discover">Explore other services ↗</Link>
        </div>
      ) : (
        <div className="cw-recommendation-grid">
          {r.data.rows.map((item) => (
            <ServiceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
export default function CustomerDashboard() {
  const [now] = useState(() => Date.now()),
    { user } = useAuth(),
    r = useCustomerData("/dashboard"),
    catalog = useCustomerData("/catalog");
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  const d = r.data,
    e = d?.event;
  const days = e
    ? Math.max(
        0,
        Math.ceil(
          (new Date(`${String(e.eventDate).slice(0, 10)}T00:00:00+05:30`) -
            now) /
            86400000,
        ),
      )
    : null;
  const checklist = [
      ["Create your event", !!e],
      ["Find your dream team", Number(e?.bookedServices) > 0],
      [
        "Confirm your bookings",
        d?.bookings?.some((b) =>
          ["Confirmed", "Completed", "InProgress"].includes(b.status),
        ),
      ],
      ["Make it official", d?.stats.spent > 0],
    ],
    progress = Math.round(
      (checklist.filter((c) => c[1]).length / checklist.length) * 100,
    );
  return (
    <>
      <div className="cw-dashboard-greeting">
        <div>
          <span className="cw-eyebrow">A BEAUTIFUL BEGINNING</span>
          <h1>
            Your celebration starts here<span>.</span>
          </h1>
          <p>
            Welcome back, {user.firstName}. Let’s bring your vision to life.
          </p>
        </div>
        <Link className="cw-button cw-primary" to="/customer/events?create=1">
          <Plus size={16} /> Create an event
        </Link>
      </div>
      <section className="cw-planning-hero">
        <div className="cw-hero-copy">
          <span className="cw-hero-label">
            <Sparkles size={14} /> EVERY LITTLE DETAIL, BEAUTIFULLY YOURS
          </span>
          <h2>
            Plan Your
            <br />
            <em>Perfect Wedding</em>
          </h2>
          <p>
            Your people. Your vision. One unforgettable celebration.
            <br />
            Bring it all together, one beautiful detail at a time.
          </p>
          <Link to="/customer/discover" className="cw-button">
            Find your dream team <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="cw-hero-caption">
          <span>THE BEGINNING OF FOREVER</span>
          <i>A day as extraordinary as your story.</i>
        </div>
      </section>
      <div className="cw-kpi-grid" aria-busy={r.loading}>
        {[
          ["Active Events", "events", CalendarHeart],
          ["Upcoming Bookings", "bookings", ShoppingBag],
          ["Pending Quotations", "quotations", FileText],
          ["Wishlist Items", "wishlist", Heart],
          ["Total Spent", "spent", Wallet],
        ].map(([label, key, Icon], i) => (
          <div className="cw-kpi" key={key}>
            <div>
              <span>{label}</span>
              {r.loading ? (
                <span className="cw-skeleton cw-number-skeleton" />
              ) : (
                <strong>
                  {key === "spent" ? money(d.stats[key], true) : d.stats[key]}
                </strong>
              )}
              <small>
                {
                  [
                    "Your celebrations",
                    "Getting closer to the day",
                    "Ready for your decision",
                    "Saved with love",
                    "Verified INR payments",
                  ][i]
                }
              </small>
            </div>
            <span className={`cw-kpi-icon tone-${i}`}>
              <Icon size={20} strokeWidth={1.6} />
            </span>
          </div>
        ))}
      </div>
      <QuotationOverview role="Customer" />
      <div className="cw-dashboard-middle">
        <section className="cw-event-feature">
          <header>
            <div>
              <span className="cw-eyebrow">
                THE DAY YOU’RE COUNTING DOWN TO
              </span>
              <h2>Your upcoming event</h2>
            </div>
            <Link to="/customer/events">
              All events <ArrowUpRight size={15} />
            </Link>
          </header>
          {r.loading ? (
            <div className="cw-skeleton h-48" />
          ) : e ? (
            <>
              <div className="cw-event-feature-top">
                <span className="cw-event-symbol">
                  <CalendarHeart size={27} strokeWidth={1.2} />
                </span>
                <div>
                  <Badge>{e.type}</Badge>
                  <h3>{e.name}</h3>
                  <p>
                    <MapPin size={13} />
                    {[e.city, e.state].filter(Boolean).join(", ")}
                  </p>
                </div>
                <div className="cw-countdown">
                  <strong>{days}</strong>
                  <span>DAYS TO GO</span>
                </div>
              </div>
              <div className="cw-event-facts">
                <div>
                  <CalendarDays size={16} />
                  <span>
                    Event date<strong>{date(e.eventDate)}</strong>
                  </span>
                </div>
                <div>
                  <Users size={16} />
                  <span>
                    Guest count<strong>{e.guests} guests</strong>
                  </span>
                </div>
                <div>
                  <Wallet size={16} />
                  <span>
                    Your budget<strong>{money(e.budget)}</strong>
                  </span>
                </div>
              </div>
              <footer>
                <div>
                  <span>
                    <strong>{e.bookedServices}</strong> booked services
                  </span>
                  <small>{money(e.committed)} committed</small>
                </div>
                <Link className="cw-button" to={`/customer/events/${e.id}`}>
                  Manage event <ArrowRight size={15} />
                </Link>
              </footer>
            </>
          ) : (
            <Empty
              title="Your story starts with a date"
              text="Create your first event to keep your budget, guests and vendors together."
              action={
                <Link
                  className="cw-button cw-primary"
                  to="/customer/events?create=1"
                >
                  Plan my event <Plus size={15} />
                </Link>
              }
            />
          )}
        </section>
        <section className="cw-planning-card">
          <span className="cw-eyebrow">ONE STEP CLOSER</span>
          <h2>Your planning journey</h2>
          <div className="cw-planning-progress">
            <strong>
              {progress}
              <small>%</small>
            </strong>
            <span>
              Little steps.
              <br />
              Beautiful memories.
            </span>
          </div>
          <div className="cw-progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <ul>
            {checklist.map(([label, done]) => (
              <li key={label} className={done ? "done" : ""}>
                <span>{done ? <Check size={12} /> : null}</span>
                {label}
              </li>
            ))}
          </ul>
          <Link to="/customer/events">
            Keep planning <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <section className="cw-quick-start">
        <Sparkles size={23} />
        <div>
          <h3>A dream team for your dream day</h3>
          <p>
            From the perfect venue to the final flourish — find your kind of
            extraordinary.
          </p>
        </div>
        <Link to="/customer/discover">
          Explore all services <ArrowUpRight size={16} />
        </Link>
      </section>
      {catalog.error ? (
        <ErrorView error={catalog.error} retry={catalog.retry} />
      ) : catalog.loading ? (
        <div className="cw-skeleton h-64" />
      ) : (
        categorySections.map(([title, name]) => {
          const c = catalog.data.categories.find((c) => c.name === name);
          return c ? (
            <Recommendation
              key={c.id}
              title={title}
              category={name}
              id={c.id}
            />
          ) : null;
        })
      )}
      <section className="cw-event-feature cw-recent-bookings">
        <header>
          <div>
            <span className="cw-eyebrow">COMING TOGETHER</span>
            <h2>Your latest bookings</h2>
          </div>
          <Link to="/customer/bookings">
            View all <ArrowUpRight size={15} />
          </Link>
        </header>
        {r.loading ? (
          <div className="cw-skeleton h-32" />
        ) : !d.bookings.length ? (
          <Empty
            title="Your dream team is waiting"
            text="Your booking requests and confirmations will appear here."
            action={
              <Link to="/customer/discover" className="cw-button">
                Discover services
              </Link>
            }
          />
        ) : (
          <div className="cw-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendor / service</th>
                  <th>Event date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.vendor}</strong>
                      <small>{b.services}</small>
                    </td>
                    <td>{date(b.bookingDate)}</td>
                    <td>{money(b.amount)}</td>
                    <td>
                      <Badge>{b.status}</Badge>
                    </td>
                    <td>
                      <Link to={`/customer/bookings/${b.id}`}>
                        View <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <footer className="cw-page-footer">
        <span>MarryNest</span> Thoughtfully planned. Wholeheartedly celebrated.
      </footer>
    </>
  );
}
