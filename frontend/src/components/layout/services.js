import { useQuery } from "@apollo/client/react";
import { CATEGORIES } from "../../services/public";
import {
  MapPin,
  Tent,
  Flower2,
  Lamp,
  Utensils,
  Music2,
  Sparkles,
  Camera,
  Brush,
  Hand,
  Shirt,
  Gem,
  Car,
  Flame,
  Flower,
  Users,
  Monitor,
} from "lucide-react";
export const serviceGroups = [
  {
    name: "Venue & Event",
    items: [
      ["Venue & Location", "Beautiful settings for your story", MapPin],
      ["Tent & Infrastructure", "Space for every celebration", Tent],
      ["Decoration", "Details that make it yours", Flower2],
      ["Lighting", "Set the mood, beautifully", Lamp],
    ],
  },
  {
    name: "Food & Entertainment",
    items: [
      ["Catering & Food", "Menus made for memorable moments", Utensils],
      ["DJ & Entertainment", "Keep the celebration alive", Music2],
      ["Traditional Wedding Services", "Celebrate your traditions", Sparkles],
    ],
  },
  {
    name: "Wedding Essentials",
    items: [
      ["Photography & Videography", "Your forever, frame by frame", Camera],
      ["Makeup & Beauty", "Feel like your most beautiful self", Brush],
      ["Mehndi", "A little colour, a lot of meaning", Hand],
      ["Wedding Clothing", "Find your celebration style", Shirt],
      ["Jewellery & Accessories", "The perfect finishing touches", Gem],
    ],
  },
  {
    name: "Additional Services",
    items: [
      ["Transportation", "Arrive in celebration", Car],
      ["Religious & Ceremony Services", "Meaning in every ritual", Flame],
      ["Flowers & Florist", "Fresh blooms, lasting impressions", Flower],
      ["Event Support", "Helping everything come together", Users],
      ["Technology", "Thoughtfully connected celebrations", Monitor],
    ],
  },
];
export const servicePath = (name) =>
  `/services?category=${encodeURIComponent(name)}`;
export function useServiceGroups() {
  const { data } = useQuery(CATEGORIES, { fetchPolicy: "cache-and-network" });
  const groups = serviceGroups.map((group) => ({
    name: group.name,
    items: [],
  }));
  for (const category of data?.popularServices || []) {
    const index = serviceGroups.findIndex((group) =>
      group.items.some(([name]) => name === category.name),
    );
    const original =
      index >= 0
        ? serviceGroups[index].items.find(([name]) => name === category.name)
        : null;
    groups[index < 0 ? groups.length - 1 : index].items.push([
      category.name,
      category.description ||
        original?.[1] ||
        "Explore services for your celebration",
      original?.[2] || Users,
    ]);
  }
  return groups;
}
