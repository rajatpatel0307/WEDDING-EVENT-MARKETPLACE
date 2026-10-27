import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  HeartHandshake,
  ShieldCheck,
  Eye,
  Sparkles,
  Layers,
  Users,
  Heart,
} from "lucide-react";
import SectionHeader from "../common/SectionHeader";
import { serviceGroups, servicePath } from "../layout/services";
export function AboutHero() {
  return (
    <section className="mp-about-hero">
      <span className="mn-kicker">A LITTLE ABOUT OUR BIG IDEA</span>
      <h1>
        Making wedding planning
        <br />
        <em>simple, beautiful and stress-free.</em>
      </h1>
      <p>
        We bring venues, wedding professionals and essential services together
        in one thoughtfully connected marketplace.
      </p>
      <Link className="mn-button" to="/services">
        Explore our marketplace <ArrowUpRight size={16} />
      </Link>
      <div className="mp-about-photo">
        <img
          src="/images/wedding-garden-1024.webp"
          srcSet="/images/wedding-garden-640.webp 640w, /images/wedding-garden-1024.webp 1024w"
          sizes="(max-width: 767px) 100vw, 85vw"
          width="1536"
          height="1024"
          alt="A garden wedding ceremony setting with ivory flowers and soft golden light"
          fetchPriority="high"
        />
        <span>For the moments that become your memories.</span>
      </div>
    </section>
  );
}
export function OurStory() {
  return (
    <section className="mp-section mp-story">
      <div>
        <span className="mn-kicker">OUR STORY</span>
        <h2>
          A wedding has a thousand details.
          <br />
          <em>Finding your people shouldn’t be one of them.</em>
        </h2>
      </div>
      <div>
        <p>
          Planning a wedding often means contacting one vendor after another,
          comparing prices in a notebook, checking dates across conversations,
          and keeping track of it all in different places.
        </p>
        <p>
          MarryNest is being built around a simpler idea: bring the wedding
          ecosystem together, so couples can spend less time searching and more
          time making thoughtful choices.
        </p>
        <p>
          From the place you say “I do” to the flowers on the table, we’re
          creating a home for the people and details behind a meaningful
          celebration.
        </p>
      </div>
    </section>
  );
}
export function MissionVision() {
  return (
    <section className="mp-section mp-mission-grid">
      <article>
        <HeartHandshake size={29} strokeWidth={1.2} />
        <span className="mn-kicker">OUR MISSION</span>
        <h2>
          Make the journey
          <br />a little more joyful.
        </h2>
        <p>
          To make wedding planning easier by connecting couples with venues and
          wedding professionals through a simple, transparent and convenient
          digital marketplace.
        </p>
      </article>
      <article>
        <Sparkles size={29} strokeWidth={1.2} />
        <span className="mn-kicker">OUR VISION</span>
        <h2>
          One trusted place.
          <br />
          Endless possibilities.
        </h2>
        <p>
          To become a trusted destination where couples can discover, compare
          and, as our booking tools launch, book the services they need for
          their celebration.
        </p>
      </article>
    </section>
  );
}
export function WhatWeDo() {
  return (
    <section className="mp-section">
      <SectionHeader
        eyebrow="ONE MARKETPLACE. YOUR WHOLE CELEBRATION."
        title="The big things. The little things. Everything."
        description="Explore the wedding services we bring together, from the first plan to the final finishing touch."
      />
      <div className="mp-service-pills">
        {serviceGroups
          .flatMap((g) => g.items)
          .map(([name, , Icon]) => (
            <Link to={servicePath(name)} key={name}>
              <Icon size={18} strokeWidth={1.3} />
              {name}
              <ArrowUpRight size={13} />
            </Link>
          ))}
      </div>
    </section>
  );
}
export function Values() {
  return (
    <section className="mp-values">
      <div className="mp-section">
        <SectionHeader
          eyebrow="WHAT MATTERS TO US"
          title="A little care makes all the difference."
        />
        <div className="mp-value-grid">
          {[
            [
              "Trust",
              "Build confidence through thoughtful vendor review and honest information.",
              ShieldCheck,
            ],
            [
              "Transparency",
              "Make room for clear prices, realistic expectations and informed decisions.",
              Eye,
            ],
            [
              "Quality",
              "Encourage accurate listings and attention to the details that matter.",
              Sparkles,
            ],
            [
              "Convenience",
              "Bring discovery together, with fewer places to look and less to keep track of.",
              Layers,
            ],
            [
              "Community",
              "Connect couples and the professionals behind meaningful celebrations.",
              Users,
            ],
            [
              "Customer first",
              "Design around real questions, practical needs and a more personal journey.",
              Heart,
            ],
          ].map(([title, copy, Icon]) => (
            <article key={title}>
              <Icon size={25} strokeWidth={1.2} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function Community() {
  return (
    <section className="mp-section mp-community">
      <div>
        <span className="mn-kicker">WHY WE BUILT THIS</span>
        <h2>
          Less back-and-forth.
          <br />
          <em>More looking forward.</em>
        </h2>
        <p>
          Discovery, price comparison, availability, communication, bookings,
          reviews and coordination belong in a connected journey. That’s the
          experience we’re working towards, step by thoughtful step.
        </p>
        <p>
          For couples, it starts with finding the right fit. For vendors, it
          starts with a place to tell their story and build a business around
          what they do best.
        </p>
      </div>
      <aside>
        <Users size={35} strokeWidth={1} />
        <span className="mn-kicker">OUR VENDOR COMMUNITY</span>
        <h3>
          You bring the craft.
          <br />
          We’ll help make the connection.
        </h3>
        <p>
          Whether you create beautiful spaces, unforgettable menus or the
          perfect photograph, there’s a place for your work here. Apply to join
          our growing community of wedding professionals.
        </p>
        <Link className="mn-button" to="/auth/signup?role=vendor">
          Become a vendor <ArrowUpRight size={16} />
        </Link>
      </aside>
    </section>
  );
}
