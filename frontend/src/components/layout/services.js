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
