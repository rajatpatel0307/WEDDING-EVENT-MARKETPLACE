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
import { useServiceGroups, servicePath } from "../layout/services";
export function AboutHero() {
  return (
    <section className="mp-about-hero max-w-[1320px] m-auto text-center pt-[55px] px-[5%] pb-0 [&.mp-about-hero_h1]:text-[clamp(35px,_4.2vw,_60px)] [&.mp-about-hero_h1]:my-[23px] [&.mp-about-hero_h1]:mx-0 [&.mp-about-hero_>_p]:max-w-[580px] [&.mp-about-hero_>_p]:m-auto [&.mp-about-hero_>_.mn-button]:mt-[25px] [@media(width<=767px)]:pt-[35px] [@media(width<=767px)]:px-[6%] [@media(width<=767px)]:pb-0 [@media(width<=767px)]:[&.mp-about-hero_h1]:text-[37px] [@media(width<=767px)]:[&.mp-about-hero_h1]:leading-[1.2] [@media(width<=767px)]:[&.mp-about-hero_h1_br]:hidden [@media(width<=767px)]:[&.mp-about-hero_>_p]:text-[12px]">
      <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">A LITTLE ABOUT OUR BIG IDEA</span>
      <h1>
        Making wedding planning
        <br />
        <em>simple, beautiful and stress-free.</em>
      </h1>
      <p>
        We bring venues, wedding professionals and essential services together
        in one thoughtfully connected marketplace.
      </p>
      <Link className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)]" to="/services">
        Explore our marketplace <ArrowUpRight size={16} />
      </Link>
      <div className="mp-about-photo relative mt-[38px] overflow-hidden rounded-[140px_140px_5px_5px] h-[365px] [&.mp-about-photo_img]:w-full [&.mp-about-photo_img]:h-full [&.mp-about-photo_img]:object-cover [&.mp-about-photo_img]:object-[center_60%] [&.mp-about-photo_>_span]:absolute [&.mp-about-photo_>_span]:bottom-[25px] [&.mp-about-photo_>_span]:right-[30px] [&.mp-about-photo_>_span]:text-[#fff9ed] [&.mp-about-photo_>_span]:font-[Georgia,serif] [&.mp-about-photo_>_span]:italic [&.mp-about-photo_>_span]:text-shadow-[0_1px_5px_#332017] [&.mp-about-photo_>_span]:text-[19px] [@media(width<=767px)]:h-[245px] [@media(width<=767px)]:rounded-[75px_75px_4px_4px] [@media(width<=767px)]:mt-[30px] [@media(width<=767px)]:[&.mp-about-photo_>_span]:text-[13px] [@media(width<=767px)]:[&.mp-about-photo_>_span]:right-[17px] [@media(width<=767px)]:[&.mp-about-photo_>_span]:bottom-[18px] [@media(width<=767px)]:[&.mp-about-photo_>_span]:left-[17px]">
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
    <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%] mp-story grid grid-cols-[1fr_1fr] gap-[80px] items-center [&.mp-story_h2]:text-[34px] [&.mp-story_h2]:mt-[18px] [&.mp-story_h2]:leading-[1.35] [&.mp-story_p_+_p]:mt-[16px] [@media(width<=1100px)]:gap-[40px] [@media(width<=767px)]:grid-cols-[1fr] [@media(width<=767px)]:gap-[24px] [@media(width<=767px)]:[&.mp-story_h2]:text-[29px] [@media(width<=767px)]:[&.mp-story_h2]:mt-[14px]">
      <div>
        <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">OUR STORY</span>
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
    <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%] mp-mission-grid pt-[5px] grid grid-cols-[1fr_1fr] gap-[20px] [&.mp-mission-grid_article]:p-[40px] [&.mp-mission-grid_article]:bg-[#efe3db] [&.mp-mission-grid_article]:border [&.mp-mission-grid_article]:border-[#e3d5c9] [&.mp-mission-grid_article]:flex [&.mp-mission-grid_article]:items-start [&.mp-mission-grid_article]:flex-col [&.mp-mission-grid_article]:gap-[18px] [&.mp-mission-grid_article]:rounded-[5px] [&.mp-mission-grid_article:nth-child(2)]:bg-[#eeeae0] [&.mp-mission-grid_svg]:text-[#9d7260] [&.mp-mission-grid_svg]:mb-[7px] [&.mp-mission-grid_h2]:text-[31px] [&.mp-mission-grid_p]:text-[12px] [@media(width<=767px)]:grid-cols-[1fr] [@media(width<=767px)]:pt-0 [@media(width<=767px)]:gap-[15px] [@media(width<=767px)]:[&.mp-mission-grid_article]:p-[28px] [@media(width<=767px)]:[&.mp-mission-grid_article]:gap-[14px] [@media(width<=767px)]:[&.mp-mission-grid_h2]:text-[31px] [@media(width<=767px)]:[&.mp-mission-grid_p]:text-[12px]">
      <article>
        <HeartHandshake size={29} strokeWidth={1.2} />
        <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">OUR MISSION</span>
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
        <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">OUR VISION</span>
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
  const serviceGroups = useServiceGroups();
  return (
    <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%]">
      <SectionHeader
        eyebrow="ONE MARKETPLACE. YOUR WHOLE CELEBRATION."
        title="The big things. The little things. Everything."
        description="Explore the wedding services we bring together, from the first plan to the final finishing touch."
      />
      <div className="mp-service-pills flex flex-wrap gap-[12px] [&.mp-service-pills_a]:py-[14px] [&.mp-service-pills_a]:px-[18px] [&.mp-service-pills_a]:flex [&.mp-service-pills_a]:items-center [&.mp-service-pills_a]:gap-[12px] [&.mp-service-pills_a]:border [&.mp-service-pills_a]:border-[#ddcfc4] [&.mp-service-pills_a]:rounded-[4px] [&.mp-service-pills_a]:text-[12px] [&.mp-service-pills_a]:bg-[#fffaf4] [&.mp-service-pills_svg]:text-[#9a6963] [@media(width<=767px)]:gap-[8px] [@media(width<=767px)]:[&.mp-service-pills_a]:p-[12px] [@media(width<=767px)]:[&.mp-service-pills_a]:text-[11px] [@media(width<=767px)]:[&.mp-service-pills_a]:gap-[9px]">
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
    <section className="mp-values bg-[#f0e8df]">
      <div className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%]">
        <SectionHeader
          eyebrow="WHAT MATTERS TO US"
          title="A little care makes all the difference."
        />
        <div className="mp-value-grid grid grid-cols-[repeat(3,_1fr)] gap-y-[30px] gap-x-[45px] [&.mp-value-grid_article]:py-[20px] [&.mp-value-grid_article]:px-0 [&.mp-value-grid_article]:border-t [&.mp-value-grid_article]:border-t-[#d9c5b6] [&.mp-value-grid_svg]:text-[#9d7765] [&.mp-value-grid_h3]:text-[23px] [&.mp-value-grid_h3]:mt-[15px] [&.mp-value-grid_h3]:mx-0 [&.mp-value-grid_h3]:mb-[10px] [&.mp-value-grid_p]:text-[12px] [@media(width<=767px)]:grid-cols-[1fr_1fr] [@media(width<=767px)]:gap-[20px] [@media(width<=767px)]:[&.mp-value-grid_h3]:text-[22px] [@media(width<=767px)]:[&.mp-value-grid_h3]:mt-[13px] [@media(width<=767px)]:[&.mp-value-grid_h3]:mx-0 [@media(width<=767px)]:[&.mp-value-grid_h3]:mb-[9px] [@media(width<=767px)]:[&.mp-value-grid_p]:text-[11px]">
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
    <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%] mp-community grid grid-cols-[1fr_1fr] gap-[80px] items-center [&.mp-community_h2]:mt-[17px] [&.mp-community_h2]:mx-0 [&.mp-community_h2]:mb-[22px] [&.mp-community_p_+_p]:mt-[18px] [&.mp-community_aside]:p-[38px] [&.mp-community_aside]:bg-[#f4eae3] [&.mp-community_aside]:border [&.mp-community_aside]:border-[#e0cdbf] [&.mp-community_aside]:rounded-[6px] [&.mp-community_aside_>_svg]:text-[#b48c78] [&.mp-community_aside_>_svg]:mb-[25px] [&.mp-community_aside_.mn-kicker]:block [&.mp-community_aside_h3]:text-[29px] [&.mp-community_aside_h3]:my-[18px] [&.mp-community_aside_h3]:mx-0 [&.mp-community_aside_.mn-button]:mt-[25px] [@media(width<=1100px)]:gap-[40px] [@media(width<=767px)]:grid-cols-[1fr] [@media(width<=767px)]:gap-[28px] [@media(width<=767px)]:[&.mp-community_aside]:p-[28px] [@media(width<=767px)]:[&.mp-community_aside_h3]:text-[28px]">
      <div>
        <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">WHY WE BUILT THIS</span>
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
        <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">OUR VENDOR COMMUNITY</span>
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
        <Link className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)]" to="/auth/signup?role=vendor">
          Become a vendor <ArrowUpRight size={16} />
        </Link>
      </aside>
    </section>
  );
}
