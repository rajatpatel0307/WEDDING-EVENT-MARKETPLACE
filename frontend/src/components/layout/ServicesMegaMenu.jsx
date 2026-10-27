import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { serviceGroups, servicePath } from "./services";
export default function ServicesMegaMenu({ close }) {
  return (
    <div className="mn-mega">
      <div className="mn-mega-heading">
        <div>
          <span className="mn-kicker">EVERY DETAIL, BEAUTIFULLY COVERED</span>
          <h2>A little help for your big day.</h2>
        </div>
        <Link to="/services" onClick={close}>
          Explore all services <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="mn-mega-grid">
        {serviceGroups.map((group) => (
          <section key={group.name}>
            <h3>{group.name}</h3>
            {group.items.map(([name, description, Icon]) => (
              <Link to={servicePath(name)} onClick={close} key={name}>
                <Icon size={19} strokeWidth={1.5} />
                <span>
                  <strong>{name}</strong>
                  <small>{description}</small>
                </span>
              </Link>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
