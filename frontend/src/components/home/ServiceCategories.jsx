import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { serviceGroups, servicePath } from "../layout/services";
import SectionHeader from "../common/SectionHeader";
import CollectionState from "../common/CollectionState";
import { categoryImages } from "./categoryImages";
const taxonomy = serviceGroups.flatMap((g) => g.items);
export default function ServiceCategories({
  items,
  loading,
  retry,
  visual = false,
}) {
  return (
    <section className={`mp-section ${visual ? "mp-category-section" : ""}`}>
      <SectionHeader
        eyebrow={
          visual
            ? "FIND YOUR OWN WAY TO CELEBRATE"
            : "FROM THE BIG THINGS TO THE LITTLE DETAILS"
        }
        title={
          visual
            ? "A day that’s entirely you."
            : "Everything you need for your wedding."
        }
        description={
          visual
            ? "Explore the people and possibilities behind your celebration."
            : "Find wedding professionals for every part of your celebration."
        }
        link="/services"
        linkText="All services"
      />
      {items?.length ? (
        <div className={visual ? "mp-visual-categories" : "mp-category-grid"}>
          {items.map((item) => {
            const Icon =
              taxonomy.find(([name]) => name === item.name)?.[2] || Sparkles;
            const image =
              categoryImages[item.name] || categoryImages["Venue & Location"];
            return (
              <Link
                key={item.id}
                to={servicePath(item.name)}
                className={`mp-category-card ${visual ? "mp-category-visual" : ""}`}
              >
                {visual ? (
                  <img
                    src={image}
                    alt={item.name}
                    loading="lazy"
                    width="450"
                    height="340"
                  />
                ) : (
                  <Icon size={25} strokeWidth={1.15} />
                )}
                <span>
                  <h3>{item.name}</h3>
                  {!visual && (
                    <p>
                      {item.description ||
                        taxonomy.find(([name]) => name === item.name)?.[1] ||
                        "Find the details that make your day."}
                    </p>
                  )}
                  <small>
                    Explore <ArrowUpRight size={12} />
                  </small>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <CollectionState
          loading={loading}
          failed={!items}
          retry={retry}
          empty="Our service collection is growing."
        />
      )}
    </section>
  );
}
