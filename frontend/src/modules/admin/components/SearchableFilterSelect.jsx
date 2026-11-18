import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, LoaderCircle, Search } from "lucide-react";
import { filterDropdownOptions, filterDropdownPosition } from "../filter-dropdown";

export default function SearchableFilterSelect({
  value = "", onChange, options, placeholder, ariaLabel, searchLabel,
  searchPlaceholder, className, onSearchChange, loading = false, fallbackLabel = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const [selection, setSelection] = useState(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const searchRef = useRef(null);
  const optionRefs = useRef([]);
  const listId = useId();
  const selectedValue = String(value ?? "");
  const choices = [{ value: "", label: placeholder }, ...options
    .filter(option => String(option.value) !== "")
    .map(option => ({ ...option, value: String(option.value) }))];
  const selected = choices.find(option => option.value === selectedValue);
  const selectedLabel = selected?.label ||
    (selection?.value === selectedValue ? selection.label : fallbackLabel) || placeholder;
  const filtered = filterDropdownOptions(choices, query);
  const active = Math.min(activeIndex, filtered.length - 1);
  const ready = Boolean(position);

  function close(restoreFocus = false) {
    setOpen(false);
    setPosition(null);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function show() {
    if (selected) setSelection(selected);
    setQuery("");
    onSearchChange?.("");
    setActiveIndex(Math.max(0, choices.findIndex(option => option.value === selectedValue)));
    setOpen(true);
  }

  function choose(option) {
    setSelection(option);
    onChange(option.value);
    onSearchChange?.("");
    close(true);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const reposition = event => {
      if (event?.target && popupRef.current?.contains(event.target)) return;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPosition(filterDropdownPosition(rect, {
        width: window.innerWidth, height: window.innerHeight,
      }));
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (open && ready) searchRef.current?.focus();
  }, [open, ready]);

  useEffect(() => {
    if (open && ready) optionRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [open, ready, active, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const dismiss = event => {
      if (!triggerRef.current?.contains(event.target) && !popupRef.current?.contains(event.target)) {
        setOpen(false);
        setPosition(null);
      }
    };
    const escape = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        setPosition(null);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function onKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(Math.max(0, Math.min(filtered.length - 1,
        active + (event.key === "ArrowDown" ? 1 : -1))));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[active]) choose(filtered[active]);
    } else if (event.key === "Tab") {
      close(true);
    }
  }

  return <>
    <button ref={triggerRef} type="button" className={`${className} inline-flex items-center justify-between gap-2 text-left`}
      aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
      title={selectedLabel} onClick={() => open ? close() : show()}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          show();
        }
      }}>
      <span className="min-w-0 truncate">{selectedLabel}</span>
      <ChevronDown size={14} className="shrink-0" aria-hidden="true" />
    </button>
    {open && position && createPortal(
      <div ref={popupRef} className="fixed z-[1000] overflow-hidden rounded-[10px] border border-[#dce7df] bg-white text-[#385649] shadow-[0_8px_28px_#203f3026] [font-family:Inter,_'Segoe_UI',_sans-serif]"
        style={{ left: position.left, top: position.top, bottom: position.bottom, width: position.width }}>
        <div className="border-b border-[#edf1ed] p-2">
          <div className="flex items-center gap-2 rounded-[6px] border border-[#cddfd3] bg-[#f7faf8] px-[9px] focus-within:border-[#176b60] focus-within:ring-2 focus-within:ring-[#176b6014]">
            <Search size={15} className="shrink-0 text-[#829b8a]" aria-hidden="true" />
            <input ref={searchRef} type="search" role="combobox" aria-label={searchLabel}
              aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              placeholder={searchPlaceholder} value={query} autoComplete="off"
              className="h-[36px]! w-full! min-w-0 border-0! bg-transparent! p-0! text-[12px]! font-normal! text-[#385649]! outline-none! shadow-none! ring-0! placeholder:text-[#91a496]"
              onChange={event => {
                if (selected) setSelection(selected);
                setQuery(event.target.value);
                setActiveIndex(0);
                onSearchChange?.(event.target.value);
              }} onKeyDown={onKeyDown} />
            {loading && <LoaderCircle size={14} className="shrink-0 animate-spin text-[#829b8a]" aria-label="Loading options" />}
          </div>
        </div>
        <div id={listId} role="listbox" aria-label={ariaLabel} aria-busy={loading}
          className="overflow-y-auto overscroll-contain p-1 [scrollbar-width:thin] [scrollbar-color:#afc7b8_#f3f7f4] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#afc7b8]"
          style={{ maxHeight: position.listHeight }}>
          {filtered.map((option, index) => <div key={option.value} ref={element => { optionRefs.current[index] = element; }}
            id={`${listId}-${index}`} role="option" aria-selected={selectedValue === option.value}
            className={`flex min-h-[36px] cursor-pointer items-center justify-between gap-3 rounded-[6px] px-3 py-2 text-[12px] leading-[1.5] ${active === index ? "bg-[#edf5ef] text-[#176b60]" : "text-[#526e5d]"}`}
            onPointerMove={() => setActiveIndex(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>
            <span className="min-w-0 break-words">{option.label}</span>
            {selectedValue === option.value && <Check size={14} className="shrink-0 text-[#176b60]" aria-hidden="true" />}
          </div>)}
          {!filtered.length && <div role="status" className="px-3 py-5 text-center text-[12px] text-[#83988a]">{loading ? "Searching..." : "No matches found."}</div>}
        </div>
      </div>, document.body,
    )}
  </>;
}
