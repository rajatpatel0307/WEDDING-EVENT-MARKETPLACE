import { NotificationBell } from '../communication/Notifications';
import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  CalendarHeart,
  Search,
  ShoppingBag,
  FileText,
  Heart,
  MessagesSquare,
  Bell,
  Wallet,
  Star,
  MapPin,
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCommunicationCounts } from "../../hooks/useCommunicationCounts";
import { customerRequest } from "./services/workspace.api";
const navigation = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["profile", "My Profile", UserRound],
   ["cart", "My Cart", ShoppingBag],
  ["orders", "My Orders", ShoppingBag],
  ["events", "My Events", CalendarHeart],
  ["discover", "Find Services", Search],
  ["bookings", "My Bookings", ShoppingBag],
  ["quotations", "My Quotations", FileText],
  ["wishlist", "Wishlist", Heart],
  ["messages", "Messages", MessagesSquare],
  ["notifications", "Notifications", Bell],
  ["payments", "Payments", Wallet],
  ["reviews", "Reviews", Star],
  ["addresses", "Addresses", MapPin],
  ["settings", "Settings", Settings],
 
];
const top = [
  ["Home", "/"],
  ["Services", "/customer/discover"],
  ["Vendors", "/customer/discover?type=vendors"],
  ["Venues", "/customer/discover?venue=1"],
  ["Packages", "/customer/discover?type=packages"],
  ["Offers", "/customer/discover?type=offers"],
  ["My Events", "/customer/events"],
];
export default function CustomerLayout() {
  useCommunicationCounts(customerRequest);
  const { user, logout, notify } = useAuth(),
    [open, setOpen] = useState(false),
    [profile, setProfile] = useState(false),
    [collapsed, setCollapsed] = useState(
      () => localStorage.getItem("mn-customer-collapsed") === "true",
    ),
    location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    setOpen(false);
    setProfile(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  function toggleSidebar() {
    setCollapsed((value) => {
      localStorage.setItem("mn-customer-collapsed", String(!value));
      return !value;
    });
  }
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setProfile(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  const groups = [
    { label: "WORKSPACE", items: navigation.slice(0, 1) },
    { label: "PLAN YOUR CELEBRATION", items: navigation.slice(1, 7) },
    { label: "COMMUNICATION", items: navigation.slice(7, 9) },
    { label: "MY ACCOUNT", items: navigation.slice(9) },
  ];
  return (
    <div
      className={`cw-app customer-workspace [--cw-green:#925469] [--cw-ink:#463b3d] [--cw-muted:#93898a] [--cw-gold:#b59469] min-h-[100vh] [background:#faf8f5] text-[var(--cw-ink)] [font-family:Inter,_'Segoe_UI',_sans-serif] text-[13px] leading-[1.6] isolate [&_:where(h1)]:[font-family:Georgia,_'Times_New_Roman',_serif] [&_:where(h1)]:text-[#463b3d] [&_:where(h1)]:font-[400] [&_:where(h1)]:tracking-[-1px] [&_:where(h1)]:mt-[0] [&_:where(h1)]:mr-[0] [&_:where(h1)]:mb-[0] [&_:where(h1)]:ml-[0] [&_:where(h2)]:[font-family:Georgia,_serif] [&_:where(h2)]:text-[#463b3d] [&_:where(h2)]:font-[400] [&_:where(h2)]:tracking-[-0.4px] [&_:where(h2)]:mt-[0] [&_:where(h2)]:mr-[0] [&_:where(h2)]:mb-[0] [&_:where(h2)]:ml-[0] [&_:where(h3)]:[font-family:Inter,_'Segoe_UI',_Arial,_sans-serif] [&_:where(h3)]:text-[#463b3d] [&_:where(h3)]:font-[600] [&_:where(h3)]:tracking-[-0.4px] [&_:where(h3)]:mt-[0] [&_:where(h3)]:mr-[0] [&_:where(h3)]:mb-[0] [&_:where(h3)]:ml-[0] [&_button]:cursor-pointer [&_a]:no-underline [&_a:hover]:text-[#9a5168] [&_:where(p)]:text-[#8a7d80] [&_:where(p)]:text-[12px] [&_:where(input)]:[font:inherit] [&_:where(input)]:[border-top-width:1px] [&_:where(input)]:[border-top-style:solid] [&_:where(input)]:[border-top-color:#e6ded9] [&_:where(input)]:[border-right-width:1px] [&_:where(input)]:[border-right-style:solid] [&_:where(input)]:[border-right-color:#e6ded9] [&_:where(input)]:[border-bottom-width:1px] [&_:where(input)]:[border-bottom-style:solid] [&_:where(input)]:[border-bottom-color:#e6ded9] [&_:where(input)]:[border-left-width:1px] [&_:where(input)]:[border-left-style:solid] [&_:where(input)]:[border-left-color:#e6ded9] [&_:where(input)]:[background:#fff] [&_:where(input)]:text-[#5a4b50] [&_:where(input)]:rounded-[7px] [&_:where(input)]:pt-[10px] [&_:where(input)]:pr-[12px] [&_:where(input)]:pb-[10px] [&_:where(input)]:pl-[12px] [&_:where(input)]:min-w-0 [&_:where(input)]:[box-shadow:none] [&_:where(input)]:leading-[1.6] [&_:where(select)]:[font:inherit] [&_:where(select)]:[border-top-width:1px] [&_:where(select)]:[border-top-style:solid] [&_:where(select)]:[border-top-color:#e6ded9] [&_:where(select)]:[border-right-width:1px] [&_:where(select)]:[border-right-style:solid] [&_:where(select)]:[border-right-color:#e6ded9] [&_:where(select)]:[border-bottom-width:1px] [&_:where(select)]:[border-bottom-style:solid] [&_:where(select)]:[border-bottom-color:#e6ded9] [&_:where(select)]:[border-left-width:1px] [&_:where(select)]:[border-left-style:solid] [&_:where(select)]:[border-left-color:#e6ded9] [&_:where(select)]:[background:#fff] [&_:where(select)]:text-[#5a4b50] [&_:where(select)]:rounded-[7px] [&_:where(select)]:pt-[10px] [&_:where(select)]:pr-[12px] [&_:where(select)]:pb-[10px] [&_:where(select)]:pl-[12px] [&_:where(select)]:min-w-0 [&_:where(select)]:[box-shadow:none] [&_:where(select)]:leading-[1.6] [&_:where(textarea)]:[font:inherit] [&_:where(textarea)]:[border-top-width:1px] [&_:where(textarea)]:[border-top-style:solid] [&_:where(textarea)]:[border-top-color:#e6ded9] [&_:where(textarea)]:[border-right-width:1px] [&_:where(textarea)]:[border-right-style:solid] [&_:where(textarea)]:[border-right-color:#e6ded9] [&_:where(textarea)]:[border-bottom-width:1px] [&_:where(textarea)]:[border-bottom-style:solid] [&_:where(textarea)]:[border-bottom-color:#e6ded9] [&_:where(textarea)]:[border-left-width:1px] [&_:where(textarea)]:[border-left-style:solid] [&_:where(textarea)]:[border-left-color:#e6ded9] [&_:where(textarea)]:[background:#fff] [&_:where(textarea)]:text-[#5a4b50] [&_:where(textarea)]:rounded-[7px] [&_:where(textarea)]:pt-[10px] [&_:where(textarea)]:pr-[12px] [&_:where(textarea)]:pb-[10px] [&_:where(textarea)]:pl-[12px] [&_:where(textarea)]:min-w-0 [&_:where(textarea)]:[box-shadow:none] [&_:where(textarea)]:leading-[1.6] [&_:focus-visible]:[outline:2px_solid_#8aaf94] [&_:focus-visible]:[outline-offset:3px] [&_:where(input):focus]:[outline:2px_solid_#b8ceb9] [&_:where(input):focus]:[outline-offset:1px] [&_:where(select):focus]:[outline:2px_solid_#b8ceb9] [&_:where(select):focus]:[outline-offset:1px] [&_:where(textarea):focus]:[outline:2px_solid_#b8ceb9] [&_:where(textarea):focus]:[outline-offset:1px] motion-reduce:[&_*]:[transition:none]! motion-reduce:[&_*]:[animation:none]! min-w-0 w-full [&_*]:[box-sizing:border-box] [&_:where(h1)]:text-[34px] [&_:where(h1)]:leading-[1.2] [&_:where(h2)]:text-[24px] [&_:where(p)]:leading-[1.8] [&_:where(.cw-primary)]:[background:#925469] [&_:where(.cw-primary)]:[border-top-color:#925469] [&_:where(.cw-primary)]:[border-right-color:#925469] [&_:where(.cw-primary)]:[border-bottom-color:#925469] [&_:where(.cw-primary)]:[border-left-color:#925469] [&_.cw-primary]:text-[white] [&_.cw-button]:rounded-[6px] [&_:where(.cw-button)]:text-[12px] [&_:where(.cw-button)]:gap-[9px] [&_:where(.cw-button)]:min-h-[38px] [&_:where(.cw-eyebrow)]:text-[#ad8a75] [&_:where(.cw-eyebrow)]:text-[9px] [&_:where(.cw-eyebrow)]:tracking-[2px] [&_:focus-visible]:[outline-color:#a67687] [&_.cw-page-heading]:mb-[26px] [&_.cw-panel]:[border-top-color:#ebe5df] [&_.cw-panel]:[border-right-color:#ebe5df] [&_.cw-panel]:[border-bottom-color:#ebe5df] [&_.cw-panel]:[border-left-color:#ebe5df] [&_.cw-panel]:[box-shadow:0_3px_15px_#50402d03] [&_.cw-panel-heading]:pt-[22px] [&_.cw-panel-heading]:pr-[25px] [&_.cw-panel-heading]:pb-[22px] [&_.cw-panel-heading]:pl-[25px] [&_.cw-panel-heading]:[border-top-color:#eee6e1] [&_.cw-panel-heading]:[border-right-color:#eee6e1] [&_.cw-panel-heading]:[border-bottom-color:#eee6e1] [&_.cw-panel-heading]:[border-left-color:#eee6e1] [&_.cw-panel-heading_:where(h2)]:text-[23px] [&_.cw-badge]:rounded-[4px] [&_.cw-badge]:text-[10px] [&_.cw-empty]:[background:#fffdfa] [&_.cw-empty]:min-h-[210px] [&_.cw-empty_>_span]:[background:#f8eeeb] [&_.cw-empty_>_span]:text-[#b18a91] [&_.cw-empty_:where(h3)]:[font-family:Georgia,_serif] [&_.cw-empty_:where(h3)]:text-[21px] [&_.cw-empty_:where(h3)]:font-[400] [&_.cw-back]:inline-flex [&_.cw-back]:gap-[7px] [&_.cw-back]:mb-[22px] [&_.cw-back]:text-[#9c7884] [&_.cw-back]:text-[12px] [&_.cw-loading]:min-h-[300px] [&_.cw-loading]:[background:transparent] [&_.cw-kpi-grid]:grid [&_.cw-kpi-grid]:grid-cols-[repeat(5,_minmax(0,_1fr))] [@media(width<=520px)]:[&_.cw-kpi-grid]:grid-cols-[repeat(2,_minmax(0,_1fr))]! [&_.cw-kpi-grid]:gap-[15px] [@media(width<=1250px)]:[&_.cw-kpi-grid]:gap-[10px] [&_.cw-kpi-grid]:mt-[24px] [@media(width<=520px)]:[&_.cw-kpi-grid]:mt-[17px] [&_.cw-kpi-grid]:mr-[0] [&_.cw-kpi-grid]:mb-[24px] [@media(width<=520px)]:[&_.cw-kpi-grid]:mb-[17px] [&_.cw-kpi-grid]:ml-[0] [&_.cw-kpi]:pt-[19px] [@media(width<=520px)]:[&_.cw-kpi]:pt-[17px] [@media(520px<width<=1250px)]:[&_.cw-kpi]:pt-[16px] [&_.cw-kpi]:pr-[17px] [@media(520px<width<=1250px)]:[&_.cw-kpi]:pr-[12px] [&_.cw-kpi]:pb-[19px] [@media(width<=520px)]:[&_.cw-kpi]:pb-[17px] [@media(520px<width<=1250px)]:[&_.cw-kpi]:pb-[16px] [&_.cw-kpi]:pl-[17px] [@media(520px<width<=1250px)]:[&_.cw-kpi]:pl-[12px] [&_.cw-kpi]:[background:#fff] [&_.cw-kpi]:[border-top-width:1px] [&_.cw-kpi]:[border-top-style:solid] [&_.cw-kpi]:[border-top-color:#eae3dc] [&_.cw-kpi]:[border-right-width:1px] [&_.cw-kpi]:[border-right-style:solid] [&_.cw-kpi]:[border-right-color:#eae3dc] [&_.cw-kpi]:[border-bottom-width:1px] [&_.cw-kpi]:[border-bottom-style:solid] [&_.cw-kpi]:[border-bottom-color:#eae3dc] [&_.cw-kpi]:[border-left-width:1px] [&_.cw-kpi]:[border-left-style:solid] [&_.cw-kpi]:[border-left-color:#eae3dc] [&_.cw-kpi]:rounded-[8px] [&_.cw-kpi]:flex [&_.cw-kpi]:items-start [&_.cw-kpi]:justify-between [&_.cw-kpi]:min-w-0 [&_.cw-kpi_>_div_>_span]:text-[10px] [&_.cw-kpi_>_div_>_span]:text-[#8d8281] [&_.cw-kpi_>_div_>_span]:block [&_.cw-kpi_strong]:text-[27px] [@media(width<=520px)]:[&_.cw-kpi_strong]:text-[28px] [@media(520px<width<=1250px)]:[&_.cw-kpi_strong]:text-[24px] [&_.cw-kpi_strong]:font-[500] [&_.cw-kpi_strong]:leading-[1.3] [&_.cw-kpi_strong]:block [&_.cw-kpi_strong]:mt-[9px] [&_.cw-kpi_strong]:mr-[0] [&_.cw-kpi_strong]:mb-[6px] [&_.cw-kpi_strong]:ml-[0] [&_.cw-kpi_strong]:text-[#55444a] [&_.cw-kpi_strong]:tracking-[-0.5px] [&_.cw-kpi_small]:text-[8px] [&_.cw-kpi_small]:text-[#aca09a] [&_.cw-kpi_small]:block [&_.cw-kpi_small]:[white-space:normal] [&_.cw-kpi-icon]:pt-[9px] [@media(width<=1250px)]:[&_.cw-kpi-icon]:pt-[6px] [&_.cw-kpi-icon]:pr-[9px] [@media(width<=1250px)]:[&_.cw-kpi-icon]:pr-[6px] [&_.cw-kpi-icon]:pb-[9px] [@media(width<=1250px)]:[&_.cw-kpi-icon]:pb-[6px] [&_.cw-kpi-icon]:pl-[9px] [@media(width<=1250px)]:[&_.cw-kpi-icon]:pl-[6px] [&_.cw-kpi-icon]:[background:#f7ecec] [&_.cw-kpi-icon]:text-[#b27b85] [&_.cw-kpi-icon]:rounded-[8px] [&_table]:w-full [&_table]:border-collapse [&_th]:[background:#fcfaf7] [&_th]:text-[9px] [&_th]:font-[500] [&_th]:text-[#a5968a] [&_th]:pt-[13px] [&_th]:pr-[19px] [&_th]:pb-[13px] [&_th]:pl-[19px] [&_th]:tracking-[0.4px] [&_th]:whitespace-nowrap [&_td]:pt-[17px] [&_td]:pr-[19px] [&_td]:pb-[17px] [&_td]:pl-[19px] [&_td]:[border-top-width:1px] [&_td]:[border-top-style:solid] [&_td]:[border-top-color:#f0e9e2] [&_td]:text-[#8d7d76] [&_td]:text-[11px] [&_td]:max-w-[300px] [&_td]:[overflow-wrap:anywhere] [&_td_strong]:text-[11px] [&_td_strong]:block [&_td_strong]:text-[#76625e] [&_td_strong]:font-[500] [&_td_small]:text-[9px] [&_td_small]:block [&_td_small]:mt-[5px] [&_td_small]:text-[#b1a095] [&_td_a]:inline-flex [&_td_a]:items-center [&_td_a]:gap-[5px] [&_dl]:grid [&_dl]:grid-cols-[1fr_1fr] [&_dl]:gap-[14px] [&_dl]:mt-[22px] [&_dl]:mr-[0] [&_dl]:mb-[22px] [&_dl]:ml-[0] [&_dl]:text-[12px] [&_dt]:text-[#a99281] [&_dd]:mt-[0] [&_dd]:mr-[0] [&_dd]:mb-[0] [&_dd]:ml-[0] [&_dd]:text-right [&_dd]:text-[#7e6860] [@media(width<=520px)]:[&_.cw-kpi:last-child]:col-[span_2] [&_.cw-conversations_>_button.selected]:[background:#faf0ee] [&_.cw-conversations_>_button.selected]:[border-left-color:#b78495] [&_.cw-chat-avatar]:[background:#f6eae9] [&_.cw-chat-avatar]:[border-top-color:#e9d9d8] [&_.cw-chat-avatar]:[border-right-color:#e9d9d8] [&_.cw-chat-avatar]:[border-bottom-color:#e9d9d8] [&_.cw-chat-avatar]:[border-left-color:#e9d9d8] [&_.cw-chat-avatar]:text-[#b38b94] [&_.cw-conversations_strong]:text-[#92717e] [&_.cw-chat_>_header_h2]:text-[#92717e] [&_.cw-conversations_time]:text-[#b19d9f] [&_.cw-conversations_small]:text-[#b19d9f] [&_.cw-conversations_em]:[background:#b78495] [&_.cw-chat-bubble.mine]:[background:#f7eae8] [&_.cw-chat-bubble.mine]:[border-top-color:#ecd9d5] [&_.cw-chat-bubble.mine]:[border-right-color:#ecd9d5] [&_.cw-chat-bubble.mine]:[border-bottom-color:#ecd9d5] [&_.cw-chat-bubble.mine]:[border-left-color:#ecd9d5] [&_.cw-chat-scroll]:[background:#fffdfb] [&_.cw-chat-compose_.cw-primary]:[background:#925469] [&_.cw-chat-compose_.cw-primary]:[border-top-color:#925469] [&_.cw-chat-compose_.cw-primary]:[border-right-color:#925469] [&_.cw-chat-compose_.cw-primary]:[border-bottom-color:#925469] [&_.cw-chat-compose_.cw-primary]:[border-left-color:#925469] [&_.cw-search_input]:[border-top-width:1px] [&_.cw-search_input]:[border-top-style:solid] [&_.cw-search_input]:[border-top-color:#e6ded9] [&_.cw-search_input]:[border-right-width:1px] [&_.cw-search_input]:[border-right-style:solid] [&_.cw-search_input]:[border-right-color:#e6ded9] [&_.cw-search_input]:[border-bottom-width:1px] [&_.cw-search_input]:[border-bottom-style:solid] [&_.cw-search_input]:[border-bottom-color:#e6ded9] [&_.cw-search_input]:[border-left-width:1px] [&_.cw-search_input]:[border-left-style:solid] [&_.cw-search_input]:[border-left-color:#e6ded9] [&_.cw-search_input]:[background:white] [&_.cw-service-card:focus-within]:[box-shadow:0_0_0_2px_#c5a8b0] [&_.cw-customer-sidebar]:top-[86px] [@media(width<=800px)]:[&_.cw-customer-sidebar]:top-[72px] [&_.cw-customer-sidebar]:bottom-[0] [&_.cw-customer-sidebar]:w-[244px] [&_.cw-customer-sidebar]:pt-[0] [&_.cw-customer-sidebar]:pr-[0] [&_.cw-customer-sidebar]:pb-[0] [&_.cw-customer-sidebar]:pl-[0] [&_.cw-customer-sidebar]:flex [&_.cw-customer-sidebar]:flex-col [&_.cw-customer-sidebar]:[background:#fffefa] [&_.cw-customer-sidebar]:[border-right-width:1px] [&_.cw-customer-sidebar]:[border-right-style:solid] [&_.cw-customer-sidebar]:[border-right-color:#e4ebe6] [&_.cw-customer-sidebar]:overflow-x-hidden [&_.cw-customer-sidebar]:overflow-y-hidden [&_.cw-customer-sidebar]:z-[40] [@media(width<=800px)]:[&_.cw-customer-sidebar]:z-[50] [&_.cw-customer-sidebar]:[transition:width_0.2s_ease,_transform_0.2s_ease,_visibility_0.2s] motion-reduce:[&_.cw-customer-sidebar]:[transition:none] [&_.cw-sidebar-header]:h-[60px] [&_.cw-sidebar-header]:min-h-[60px] [&_.cw-sidebar-header]:flex [&_.cw-sidebar-header]:items-center [&_.cw-sidebar-header]:gap-[10px] [&_.cw-sidebar-header]:pt-[12px] [&_.cw-sidebar-header]:pr-[16px] [&_.cw-sidebar-header]:pb-[12px] [&_.cw-sidebar-header]:pl-[16px] [&_.cw-sidebar-header]:shrink-0 [&_.cw-sidebar-logo]:block [&_.cw-sidebar-logo]:flex-1 [&_.cw-sidebar-logo]:min-w-0 [&_.cw-sidebar-logo_img]:block [&_.cw-sidebar-logo_img]:max-w-[160px] [&_.cw-sidebar-logo_img]:w-full [&_.cw-sidebar-logo_img]:h-auto [&_.cw-sidebar-logo_img]:object-contain [&_.cw-sidebar-compact-logo]:hidden [&_.cw-sidebar-compact-logo]:shrink-0 [&_.cw-sidebar-compact-logo_img]:block [&_.cw-sidebar-compact-logo_img]:w-[44px] [&_.cw-sidebar-compact-logo_img]:h-[39px] [&_.cw-sidebar-compact-logo_img]:object-contain [&_.cw-sidebar-compact-logo_img]:rounded-[7px] [&_.cw-sidebar-toggle]:shrink-0 [&_.cw-sidebar-toggle]:text-[#7c8e82] [&_.cw-customer-sidebar_>_nav]:block [&_.cw-customer-sidebar_>_nav]:flex-1 [&_.cw-customer-sidebar_>_nav]:min-h-[0] [&_.cw-customer-sidebar_>_nav]:overflow-y-auto [&_.cw-customer-sidebar_>_nav]:overflow-x-hidden [&_.cw-customer-sidebar_>_nav]:pt-[0] [&_.cw-customer-sidebar_>_nav]:pr-[13px] [&_.cw-customer-sidebar_>_nav]:pb-[20px] [&_.cw-customer-sidebar_>_nav]:pl-[13px] [&_.cw-customer-sidebar_>_nav]:[scrollbar-width:thin] [&_.cw-customer-sidebar_>_nav]:[scrollbar-color:#dfe7e1_transparent] [&_.cw-sidebar-group]:mb-[15px] [&_.cw-sidebar-group_>_h2]:[font-family:Inter,_'Segoe_UI',_sans-serif] [&_.cw-sidebar-group_>_h2]:pt-[13px] [&_.cw-sidebar-group_>_h2]:pr-[12px] [&_.cw-sidebar-group_>_h2]:pb-[8px] [&_.cw-sidebar-group_>_h2]:pl-[12px] [&_.cw-sidebar-group_>_h2]:mt-[0] [&_.cw-sidebar-group_>_h2]:mr-[0] [&_.cw-sidebar-group_>_h2]:mb-[0] [&_.cw-sidebar-group_>_h2]:ml-[0] [&_.cw-sidebar-group_>_h2]:text-[#7b8d81] [&_.cw-sidebar-group_>_h2]:text-[9px] [&_.cw-sidebar-group_>_h2]:font-[600] [&_.cw-sidebar-group_>_h2]:leading-[1.5] [&_.cw-sidebar-group_>_h2]:tracking-[1.3px] [&_.cw-sidebar-group_>_a]:flex [&_.cw-sidebar-group_>_a]:items-center [&_.cw-sidebar-group_>_a]:gap-[11px] [&_.cw-sidebar-group_>_a]:pt-[9px] [&_.cw-sidebar-group_>_a]:pr-[12px] [&_.cw-sidebar-group_>_a]:pb-[9px] [&_.cw-sidebar-group_>_a]:pl-[12px] [&_.cw-sidebar-group_>_a]:rounded-[7px] [&_.cw-sidebar-group_>_a]:mt-[2px] [&_.cw-sidebar-group_>_a]:mr-[0] [&_.cw-sidebar-group_>_a]:mb-[2px] [&_.cw-sidebar-group_>_a]:ml-[0] [&_.cw-sidebar-group_>_a]:text-[#738078] [&_.cw-sidebar-group_>_a]:text-[11px] [&_.cw-sidebar-group_>_a]:relative [&_.cw-sidebar-group_>_a]:whitespace-nowrap [&_.cw-sidebar-group_>_a]:min-h-[36px] [&_.cw-sidebar-group_>_a_>_svg]:shrink-0 [&_.cw-sidebar-group_>_a:hover]:[background:#f4f7f4] [&_.cw-sidebar-group_>_a:hover]:text-[#4f6b5e] [&_.cw-sidebar-group_>_a.active]:[background:#e9f2ec] [&_.cw-sidebar-group_>_a.active]:text-[#176b60] [&_.cw-sidebar-group_>_a.active]:font-[600] [&_.cw-sidebar-group_>_a.active]:[box-shadow:none] [&_.cw-sidebar-group_>_a.active:before]:[content:''] [&_.cw-sidebar-group_>_a.active:before]:w-[3px] [&_.cw-sidebar-group_>_a.active:before]:h-[18px] [&_.cw-sidebar-group_>_a.active:before]:[background:#176b60] [&_.cw-sidebar-group_>_a.active:before]:rounded-[3px] [&_.cw-sidebar-group_>_a.active:before]:absolute [&_.cw-sidebar-group_>_a.active:before]:left-[-13px] [&_.cw-sidebar-group_>_a_>_i]:h-[5px] [&_.cw-sidebar-group_>_a_>_i]:w-[5px] [&_.cw-sidebar-group_>_a_>_i]:ml-[auto] [&_.cw-sidebar-group_>_a_>_i]:[background:#176b60] [&_.cw-sidebar-group_>_a_>_i]:rounded-[50%] [&_.cw-sidebar-count]:ml-[auto] [&_.cw-sidebar-count]:[background:#e7eeea] [&_.cw-sidebar-count]:text-[#627e6f] [&_.cw-sidebar-count]:text-[9px] [&_.cw-sidebar-count]:font-[500] [&_.cw-sidebar-count]:pt-[0] [&_.cw-sidebar-count]:pr-[6px] [&_.cw-sidebar-count]:pb-[0] [&_.cw-sidebar-count]:pl-[6px] [&_.cw-sidebar-count]:rounded-[4px] [&_.cw-customer-nav]:ml-[0] [&_.cw-customer-nav]:w-full [&_.cw-customer-nav]:h-[86px] [@media(width<=800px)]:[&_.cw-customer-nav]:h-[72px] [&_.cw-customer-nav]:pt-[0] [&_.cw-customer-nav]:pr-[32px] [@media(width<=520px)]:[&_.cw-customer-nav]:pr-[16px] [@media(520px<width<=800px)]:[&_.cw-customer-nav]:pr-[20px] [@media(800px<width<=1250px)]:[&_.cw-customer-nav]:pr-[24px] [&_.cw-customer-nav]:pb-[0] [&_.cw-customer-nav]:pl-[32px] [@media(width<=520px)]:[&_.cw-customer-nav]:pl-[16px] [@media(520px<width<=800px)]:[&_.cw-customer-nav]:pl-[20px] [@media(800px<width<=1250px)]:[&_.cw-customer-nav]:pl-[24px] [&_.cw-customer-nav]:[transition:none] motion-reduce:[&_.cw-customer-nav]:[transition:none] [&_.cw-customer-nav_>_nav]:justify-start [&_.cw-customer-nav_>_nav]:gap-[25px] [@media(width<=1050px)]:[&_.cw-customer-nav_>_nav]:gap-[15px] [@media(1050px<width<=1250px)]:[&_.cw-customer-nav_>_nav]:gap-[18px] [&_.cw-customer-main]:ml-[244px] [@media(width<=800px)]:[&_.cw-customer-main]:ml-[0] [&_.cw-customer-main]:[transition:margin-left_0.2s_ease] motion-reduce:[&_.cw-customer-main]:[transition:none] [&_.cw-navbar-brand]:block [&_.cw-sidebar-mobile-close]:hidden [@media(width<=800px)]:[&_.cw-sidebar-mobile-close]:grid [&.cw-sidebar-collapsed_.cw-customer-sidebar]:w-[64px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-sidebar]:w-[244px] [&.cw-sidebar-collapsed_.cw-customer-main]:ml-[64px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-main]:ml-[0] [&.cw-sidebar-collapsed_.cw-customer-nav]:ml-[0] [&.cw-sidebar-collapsed_.cw-customer-nav]:w-full [&.cw-sidebar-collapsed_.cw-sidebar-header]:h-[60px] [&.cw-sidebar-collapsed_.cw-sidebar-header]:min-h-[60px] [&.cw-sidebar-collapsed_.cw-sidebar-header]:pt-[12px] [&.cw-sidebar-collapsed_.cw-sidebar-header]:pr-[0] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-header]:pr-[16px] [&.cw-sidebar-collapsed_.cw-sidebar-header]:pb-[12px] [&.cw-sidebar-collapsed_.cw-sidebar-header]:pl-[0] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-header]:pl-[16px] [&.cw-sidebar-collapsed_.cw-sidebar-header]:justify-center [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-header]:justify-between [&.cw-sidebar-collapsed_.cw-sidebar-header]:flex-row [&.cw-sidebar-collapsed_.cw-sidebar-header]:gap-[10px] [&.cw-sidebar-collapsed_.cw-sidebar-logo]:hidden [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-logo]:block [&.cw-sidebar-collapsed_.cw-sidebar-group_>_h2]:hidden [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-group_>_h2]:block [&.cw-sidebar-collapsed_.cw-sidebar-group_>_a_>_span]:hidden [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-group_>_a_>_span]:[display:inline] [&.cw-sidebar-collapsed_.cw-sidebar-count]:hidden [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-count]:[display:inline] [&.cw-sidebar-collapsed_.cw-sidebar-group_>_a_>_i]:hidden [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-group_>_a_>_i]:block [&.cw-sidebar-collapsed_.cw-sidebar-compact-logo]:flex [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-compact-logo]:hidden [&.cw-sidebar-collapsed_.cw-customer-sidebar_>_nav]:pl-[8px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-sidebar_>_nav]:pl-[13px] [&.cw-sidebar-collapsed_.cw-customer-sidebar_>_nav]:pr-[8px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-sidebar_>_nav]:pr-[13px] [&.cw-sidebar-collapsed_.cw-sidebar-group_>_a]:justify-center [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-group_>_a]:justify-start [&.cw-sidebar-collapsed_.cw-sidebar-group_>_a]:pt-[10px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-group_>_a]:pt-[9px] [&.cw-sidebar-collapsed_.cw-sidebar-group_>_a]:pr-[10px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-group_>_a]:pr-[12px] [&.cw-sidebar-collapsed_.cw-sidebar-group_>_a]:pb-[10px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-group_>_a]:pb-[9px] [&.cw-sidebar-collapsed_.cw-sidebar-group_>_a]:pl-[10px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-group_>_a]:pl-[12px] [&.cw-sidebar-collapsed_.cw-sidebar-group_>_a.active:before]:left-[-8px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-group_>_a.active:before]:left-[-13px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-nav]:h-[72px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-nav]:pt-[0] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-nav]:pr-[20px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-nav]:pb-[0] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-nav]:pl-[20px] [&_.cw-navbar-brand]:min-w-0 [&_.cw-navbar-brand_img]:w-[160px] [@media(width<=520px)]:[&_.cw-navbar-brand_img]:w-[124px] [@media(520px<width<=800px)]:[&_.cw-navbar-brand_img]:w-[135px] [@media(800px<width<=1050px)]:[&_.cw-navbar-brand_img]:w-[140px] [&_.cw-navbar-brand_img]:h-auto [&_.cw-navbar-brand_img]:block [@media(width<=800px)]:[&_.cw-customer-sidebar]:[transform:translateX(-100%)] [@media(width<=800px)]:[&_.cw-customer-sidebar]:invisible [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-sidebar]:[transform:translateX(-100%)] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-sidebar]:invisible [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-sidebar]:z-[50] [@media(width<=800px)]:[&_.cw-customer-sidebar.open]:[transform:translateX(0)] [@media(width<=800px)]:[&_.cw-customer-sidebar.open]:visible [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-sidebar.open]:[transform:translateX(0)] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-sidebar.open]:visible [@media(width<=800px)]:[&_.cw-sidebar-shade]:block [@media(width<=800px)]:[&_.cw-sidebar-shade]:[inset:72px_0_0] [@media(width<=800px)]:[&_.cw-sidebar-shade]:z-[45] [&_.cw-sidebar-header]:flex-row [&_.cw-sidebar-header]:justify-between [@media(width<=800px)]:[&_.cw-sidebar-toggle]:hidden [@media(width<=800px)]:[&_.cw-sidebar-mobile-close]:[position:static] [@media(width<=800px)]:[&_.cw-sidebar-mobile-close]:top-[28px] [@media(width<=800px)]:[&_.cw-sidebar-mobile-close]:right-[16px] [@media(width<=800px)]:[&_.cw-sidebar-mobile-close]:text-[#7c8e82] [&_.cw-customer-nav]:z-[60] [&.cw-sidebar-collapsed_.cw-customer-nav]:z-[60] [&.cw-sidebar-collapsed_.cw-customer-nav]:[transition:none] [&_.cw-navbar-brand]:shrink-0 [&_.cw-navbar-brand_img]:object-contain [&.cw-sidebar-collapsed_.cw-customer-sidebar]:top-[86px] [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-customer-sidebar]:top-[72px] [&_.cw-sidebar-title]:text-[11px] [&_.cw-sidebar-title]:font-[500] [&_.cw-sidebar-title]:text-[#7b8d81] [&_.cw-sidebar-title]:whitespace-nowrap [&.cw-sidebar-collapsed_.cw-sidebar-title]:hidden [@media(width<=800px)]:[&.cw-sidebar-collapsed_.cw-sidebar-title]:block [@media(width<=520px)]:[&_.cw-customer-nav]:gap-[10px] [@media(520px<width<=1050px)]:[&_.cw-customer-nav]:gap-[20px] ${collapsed ? "cw-sidebar-collapsed" : ""}`}
    >
      <header className="cw-customer-nav h-[85px] [@media(width<=800px)]:h-[72px] flex items-center pt-[0] pr-[35px] [@media(width<=360px)]:pr-[14px] [@media(360px<width<=520px)]:pr-[16px] [@media(520px<width<=800px)]:pr-[20px] [@media(800px<width<=1250px)]:pr-[24px] pb-[0] pl-[35px] [@media(width<=360px)]:pl-[14px] [@media(360px<width<=520px)]:pl-[16px] [@media(520px<width<=800px)]:pl-[20px] [@media(800px<width<=1250px)]:pl-[24px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#eee6df] [background:#fff] gap-[34px] [@media(width<=520px)]:gap-[10px] [@media(520px<width<=1250px)]:gap-[18px] sticky top-[0] z-[30] [&_>_nav]:flex [@media(width<=800px)]:[&_>_nav]:hidden [&_>_nav]:items-center [&_>_nav]:gap-[25px] [@media(width<=1050px)]:[&_>_nav]:gap-[13px] [@media(1050px<width<=1250px)]:[&_>_nav]:gap-[16px] [&_>_nav]:flex-1 [&_>_nav]:justify-center [&_>_nav_a]:text-[11px] [@media(width<=1250px)]:[&_>_nav_a]:text-[10px] [&_>_nav_a]:text-[#796e70] [&_>_nav_a]:whitespace-nowrap [@media(width<=1050px)]:[&_>_nav_a:nth-last-child(-n_+_2)]:hidden [@media(width<=800px)]:justify-between">
        <Link
          to="/customer/dashboard"
          className="cw-navbar-brand"
          aria-label="MarryNest customer dashboard"
        >
          <img
            src="/images/marrynest-logo-320.webp"
            alt="MarryNest"
            width="160"
            height="68"
          />
        </Link>
        <nav aria-label="Marketplace navigation">
          {top.map(([name, path]) => (
            <Link key={name} to={path}>
              {name}
            </Link>
          ))}
        </nav>
        <div className="cw-nav-actions flex items-center gap-[21px] [@media(width<=520px)]:gap-[10px] [@media(520px<width<=1250px)]:gap-[14px] text-[#8c777e] [&_>_a]:flex [@media(width<=520px)]:[&_>_a:nth-child(2)]:hidden [@media(width<=360px)]:[&_>_a:first-child]:hidden">
          <Link to="/customer/wishlist" aria-label="Wishlist">
            <Heart size={19} />
          </Link>
          <Link to="/customer/messages" aria-label="Messages">
            <MessagesSquare size={19} />
          </Link>
          <NotificationBell role="Customer" />
          <div className="cw-profile-menu relative [border-left-width:1px] [border-left-style:solid] [border-left-color:#eee6e1] pl-[18px] [@media(width<=520px)]:pl-[10px]">
            <button
              onClick={() => setProfile(!profile)}
              aria-expanded={profile}
              aria-label="Open profile menu"
              className="cw-avatar-button flex items-center gap-[9px] [border-top-width:0] [border-top-style:none] [border-top-color:currentColor] [border-right-width:0] [border-right-style:none] [border-right-color:currentColor] [border-bottom-width:0] [border-bottom-style:none] [border-bottom-color:currentColor] [border-left-width:0] [border-left-style:none] [border-left-color:currentColor] [background:none] pt-[0] pr-[0] pb-[0] pl-[0] text-[#876875] [&_>_span]:h-[35px] [&_>_span]:w-[35px] [&_>_span]:rounded-[50%] [&_>_span]:[background:#f1e8e5] [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:text-[15px] [&_>_span]:object-cover [&_>_img]:h-[35px] [&_>_img]:w-[35px] [&_>_img]:rounded-[50%] [&_>_img]:[background:#f1e8e5] [&_>_img]:grid [&_>_img]:place-items-center [&_>_img]:text-[15px] [&_>_img]:object-cover [@media(width<=520px)]:[&_>_svg]:hidden"
            >
              {user.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt="" />
              ) : (
                <span>{user.firstName?.[0]}</span>
              )}
              <ChevronDown size={13} />
            </button>
            {profile && (
              <div className="cw-profile-dropdown absolute right-[0] top-[46px] w-[195px] [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e9dfd9] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e9dfd9] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e9dfd9] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e9dfd9] rounded-[9px] [box-shadow:0_8px_30px_#51363e15] pt-[8px] pr-[8px] pb-[8px] pl-[8px] z-[40] [&_a]:pt-[10px] [&_a]:pr-[12px] [&_a]:pb-[10px] [&_a]:pl-[12px] [&_a]:flex [&_a]:w-full [&_a]:[border-top-width:0] [&_a]:[border-top-style:none] [&_a]:[border-top-color:currentColor] [&_a]:[border-right-width:0] [&_a]:[border-right-style:none] [&_a]:[border-right-color:currentColor] [&_a]:[border-bottom-width:0] [&_a]:[border-bottom-style:none] [&_a]:[border-bottom-color:currentColor] [&_a]:[border-left-width:0] [&_a]:[border-left-style:none] [&_a]:[border-left-color:currentColor] [&_a]:[background:none] [&_a]:gap-[8px] [&_a]:text-[#6c525c] [&_a]:text-left [&_a]:text-[12px] [&_a]:rounded-[5px] [&_button]:pt-[10px] [&_button]:pr-[12px] [&_button]:pb-[10px] [&_button]:pl-[12px] [&_button]:flex [&_button]:w-full [&_button]:[border-top-width:0] [&_button]:[border-top-style:none] [&_button]:[border-top-color:currentColor] [&_button]:[border-right-width:0] [&_button]:[border-right-style:none] [&_button]:[border-right-color:currentColor] [&_button]:[border-bottom-width:0] [&_button]:[border-bottom-style:none] [&_button]:[border-bottom-color:currentColor] [&_button]:[border-left-width:0] [&_button]:[border-left-style:none] [&_button]:[border-left-color:currentColor] [&_button]:[background:none] [&_button]:gap-[8px] [&_button]:text-[#6c525c] [&_button]:text-left [&_button]:text-[12px] [&_button]:rounded-[5px] [&_a:hover]:[background:#f8f0ec] [&_button:hover]:[background:#f8f0ec]">
                {[
                  ["My Profile", "profile"],
                  ["My Addresses", "addresses"],
                  ["My Bookings", "bookings"],
                  ["My Quotations", "quotations"],
                  ["Payments", "payments"],
                ].map(([n, p]) => (
                  <Link
                    key={p}
                    to={`/customer/${p}`}
                    onClick={() => setProfile(false)}
                  >
                    {n}
                  </Link>
                ))}
                <button
                  onClick={async () => {
                    try {
                      await logout();
                      navigate("/auth/login");
                    } catch (e) {
                      notify(e.message);
                    }
                  }}
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
          <button
            className="cw-mobile-menu cw-icon hidden [@media(width<=800px)]:grid items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e] [background:none] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] rounded-[5px] pt-[0] pr-[0] pb-[0] pl-[0] [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]"
            onClick={() => setOpen(!open)}
            aria-controls="customer-sidebar"
            aria-label="Toggle dashboard navigation"
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {open && (
        <button
          className="cw-sidebar-shade hidden [@media(width<=800px)]:block [@media(width<=800px)]:fixed [@media(width<=800px)]:[inset:72px_0_0] [@media(width<=800px)]:[background:#34212950] [@media(width<=800px)]:z-[24] [@media(width<=800px)]:[border-top-width:0] [@media(width<=800px)]:[border-top-style:none] [@media(width<=800px)]:[border-top-color:currentColor] [@media(width<=800px)]:[border-right-width:0] [@media(width<=800px)]:[border-right-style:none] [@media(width<=800px)]:[border-right-color:currentColor] [@media(width<=800px)]:[border-bottom-width:0] [@media(width<=800px)]:[border-bottom-style:none] [@media(width<=800px)]:[border-bottom-color:currentColor] [@media(width<=800px)]:[border-left-width:0] [@media(width<=800px)]:[border-left-style:none] [@media(width<=800px)]:[border-left-color:currentColor]"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        id="customer-sidebar"
        className={`cw-customer-sidebar w-[229px] [@media(width<=800px)]:w-[240px] [@media(800px<width<=1250px)]:w-[205px] fixed left-[0] top-[85px] [@media(width<=800px)]:top-[72px] bottom-[0] overflow-y-auto [scrollbar-width:thin] [border-right-width:1px] [border-right-style:solid] [border-right-color:#eae3dc] [background:#fffdfb] pt-[31px] pr-[20px] [@media(width<=1250px)]:pr-[14px] pb-[18px] pl-[20px] [@media(width<=1250px)]:pl-[14px] z-[25] [&_nav]:flex [&_nav]:flex-col [&_nav]:gap-[3px] [&_nav_>_a]:flex [&_nav_>_a]:items-center [&_nav_>_a]:gap-[12px] [&_nav_>_a]:pt-[10px] [&_nav_>_a]:pr-[13px] [&_nav_>_a]:pb-[10px] [&_nav_>_a]:pl-[13px] [&_nav_>_a]:text-[#8d7e80] [&_nav_>_a]:text-[11px] [&_nav_>_a]:rounded-[5px] [&_nav_>_a]:min-h-[40px] [&_nav_>_a.active]:[background:#f3e9e7] [&_nav_>_a.active]:text-[#925469] [&_nav_>_a.active]:[box-shadow:inset_3px_0_#a66d7f] [&_nav_>_a.active]:font-[600] [&_nav_>_a:hover]:[background:#f8f0ec] [&_nav_>_a_>_small]:ml-[auto] [&_nav_>_a_>_small]:rounded-[4px] [&_nav_>_a_>_small]:[background:#e9d9db] [&_nav_>_a_>_small]:pt-[0] [&_nav_>_a_>_small]:pr-[6px] [&_nav_>_a_>_small]:pb-[0] [&_nav_>_a_>_small]:pl-[6px] [&_.cw-nav-divider]:mt-[12px] [&_.cw-nav-divider]:[border-top-width:1px] [&_.cw-nav-divider]:[border-top-style:solid] [&_.cw-nav-divider]:[border-top-color:#f0e9e3] [&_.cw-nav-divider]:pt-[16px] [&_.cw-nav-divider]:rounded-[0] [@media(width<=800px)]:[transform:translateX(-100%)] [@media(width<=800px)]:[transition:transform_0.2s] motion-reduce:[transition:none] [@media(width<=800px)]:[&.open]:[transform:translateX(0)] ${open ? "open" : ""}`}
        aria-label="Customer navigation"
      >
        <div className="cw-sidebar-header">
          <strong className="cw-sidebar-title">Your workspace</strong>
          <button
            className="cw-icon cw-sidebar-toggle inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e] [background:none] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] rounded-[5px] pt-[0] pr-[0] pb-[0] pl-[0] [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-controls="customer-sidebar"
            aria-expanded={!collapsed}
            onClick={toggleSidebar}
          >
            {collapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>
          <button
            className="cw-icon cw-sidebar-mobile-close inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e] [background:none] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] rounded-[5px] pt-[0] pr-[0] pb-[0] pl-[0] [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <PanelLeftClose size={20} />
          </button>
        </div>
        <nav aria-label="Customer pages">
          {groups.map((group) => (
            <div className="cw-sidebar-group" key={group.label}>
              <h2>{group.label}</h2>
              {group.items.map(([path, label, Icon]) => {
                const count = {
                  wishlist: user.wishlistCount,
                  messages: user.unreadMessageCount,
                  notifications: user.unreadNotificationCount,
                }[path];
                return (
                  <NavLink
                    key={path}
                    to={`/customer/${path}`}
                    aria-label={path === "messages" && count > 0 ? `${label}: ${count} profiles with unread messages` : label}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) => (isActive ? "active" : "")}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} strokeWidth={1.7} />
                    <span>{label}</span>
                    {Number(count) > 0 && (
                      <small className="cw-sidebar-count">{count}</small>
                    )}
                    {path === "dashboard" && <i />}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <main id="main-content" className="cw-customer-main ml-[229px] [@media(width<=800px)]:ml-[0] [@media(800px<width<=1250px)]:ml-[205px] pt-[34px] [@media(width<=520px)]:pt-[23px] [@media(520px<width<=800px)]:pt-[26px] [@media(800px<width<=1250px)]:pt-[28px] pr-[37px] [@media(width<=520px)]:pr-[16px] [@media(520px<width<=800px)]:pr-[22px] [@media(800px<width<=1250px)]:pr-[25px] pb-[20px] [@media(width<=520px)]:pb-[16px] pl-[37px] [@media(width<=520px)]:pl-[16px] [@media(520px<width<=800px)]:pl-[22px] [@media(800px<width<=1250px)]:pl-[25px] min-w-0 max-w-[1800px] [&_>_.cw-panel]:mb-[24px] [@media(width>=1800px)]:mr-[auto] [@media(width<=520px)]:[&_h1]:text-[29px]">
        <Outlet />
      </main>
    </div>
  );
}
