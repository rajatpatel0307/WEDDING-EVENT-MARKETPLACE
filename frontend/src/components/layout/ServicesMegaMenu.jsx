import { Link } from "react-router-dom";
import { useServiceGroups, servicePath } from "./services";
export default function ServicesMegaMenu({ close }) {
  const serviceGroups = useServiceGroups();
  return (
    <div className="mn-mega max-w-[1400px] m-auto py-[28px] px-[32px]">
      <div className="mn-mega-grid grid grid-cols-[repeat(4,_1fr)] gap-[24px] [&_h3]:text-[#a48679] [&_h3]:uppercase [&_h3]:tracking-[1.5px] [&_h3]:text-[10px] [&_h3]:font-semibold [&_section_>_a]:flex [&_section_>_a]:items-start [&_section_>_a]:gap-[11px] [&_section_>_a]:py-[11px] [&_section_>_a]:px-[7px] [&_section_>_a]:rounded-[5px] [&_section_>_a]:whitespace-normal [&_section_>_a:hover]:bg-[#f5ede9] [&_svg]:text-[#8c414e] [&_svg]:mt-[2px] [&_strong]:text-[12px] [&_strong]:font-medium [&_strong]:block [&_small]:text-[10px] [&_small]:block [&_small]:text-[#92817e] [&_small]:leading-[1.6] [&_small]:mt-[2px]">
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
