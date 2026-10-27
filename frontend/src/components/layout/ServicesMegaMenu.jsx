import { Link } from "react-router-dom";
import { serviceGroups, servicePath } from "./services";
export default function ServicesMegaMenu({ close }) {
  return (
    <div className="mn-mega">
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
