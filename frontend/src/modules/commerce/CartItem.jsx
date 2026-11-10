import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { money } from "../customer/services/workspace.api";
import { cartQuantityBounds, validCartQuantity } from "./cart-quantity";

export default function CartItem({ line, disabled, onUpdate, onRemove, onEdit }) {
  const [quantity, setQuantity] = useState(String(line.quantity));
  const { min, max } = cartQuantityBounds(line);
  const valid = validCartQuantity(quantity, line);
  const inputId = `cart-quantity-${line.id}`;
  useEffect(() => { setQuantity(String(line.quantity)); }, [line.quantity]);
  async function update(value) {
    if (!validCartQuantity(value, line)) return;
    setQuantity(String(value));
    if (Number(value) !== Number(line.quantity)) {
      const saved = await onUpdate(Number(value));
      if (!saved) setQuantity(String(line.quantity));
    }
  }
  return (
    <li className="grid grid-cols-[76px_minmax(0,1fr)_auto] gap-[18px] py-[25px] not-first:border-t not-first:border-[#f0e9e4] max-[520px]:grid-cols-[52px_minmax(0,1fr)] max-[520px]:gap-3 max-[520px]:py-5">
      <div className="grid h-[88px] place-items-center rounded-lg border border-[#f0e5e1] bg-[linear-gradient(140deg,#faf5ef,#f2e5e7)] text-[#b18b91] max-[520px]:h-16" aria-hidden="true">
        <ShoppingBag size={30} strokeWidth={1.25} className="max-[520px]:w-[23px]" />
      </div>
      <div className="min-w-0">
        {line.vendor && <span className="mb-[3px] block text-[10px] text-[#827477] [overflow-wrap:anywhere]">{line.vendor}</span>}
        <Link className="block text-sm font-semibold leading-[1.5] text-[#463b3d] [overflow-wrap:anywhere] hover:text-[#8c414e]!" to={`/services/${line.id}`}>{line.name}</Link>
        <p className="mt-[6px] mb-[3px] text-xs text-[#68585e]!">{money(line.price)} <span className="text-[10px] text-[#827477]">/ item</span></p>
        {line.unavailable ? (
          <p className="mt-[3px] mb-[15px] text-[11px] text-[#a44545]!" role="alert">{line.unavailable}</p>
        ) : (
          <p className="mt-[3px] mb-[15px] flex items-center gap-1 text-[10px]! text-[#55745c]!"><Check size={12} /> {line.stock != null ? `${line.stock} in stock` : "Available"}</p>
        )}
        <div className="flex flex-wrap items-end gap-x-[18px] gap-y-[10px]">
          <div>
            <label className="mb-[5px] block text-[9px] text-[#827477]" htmlFor={inputId}>Quantity</label>
            <div className="flex items-center rounded-md border border-[#e5d9d9] bg-[#fffdfa]">
              <button type="button" className="inline-flex h-[34px] w-[33px] items-center justify-center rounded-[5px] border-0 bg-transparent p-0 text-[#8c414e] hover:bg-[#f6eeeb] disabled:cursor-not-allowed disabled:opacity-45" aria-label={`Decrease quantity of ${line.name}`}
                disabled={disabled || max < min || Number(quantity) <= min}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => update((valid ? Number(quantity) : Number(line.quantity)) - 1)}>
                <Minus size={14} />
              </button>
              <input id={inputId} type="number" min={min} max={max} step="1" required
                className="h-[34px] w-[52px] min-w-0 [appearance:textfield] rounded-none border-0! bg-transparent px-[2px] py-0 text-center text-xs aria-invalid:outline aria-invalid:outline-[#a44545] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                value={quantity} aria-label={`Quantity for ${line.name}`}
                aria-invalid={!valid} aria-describedby={!valid ? `${inputId}-error` : undefined}
                disabled={disabled || max < min}
                onChange={(e) => { setQuantity(e.target.value); onEdit(); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                }}
                onBlur={(e) => update(e.target.value)} />
              <button type="button" className="inline-flex h-[34px] w-[33px] items-center justify-center rounded-[5px] border-0 bg-transparent p-0 text-[#8c414e] hover:bg-[#f6eeeb] disabled:cursor-not-allowed disabled:opacity-45" aria-label={`Increase quantity of ${line.name}`}
                disabled={disabled || max < min || Number(quantity) >= max}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => update((valid ? Number(quantity) : Number(line.quantity)) + 1)}>
                <Plus size={14} />
              </button>
            </div>
          </div>
          <button type="button" className="inline-flex items-center justify-center gap-[7px] border-0 bg-transparent px-0 py-2 text-[10px] text-[#827477] hover:text-[#a44545] disabled:cursor-not-allowed disabled:opacity-45" disabled={disabled}
            aria-label={`Remove ${line.name} from cart`} onClick={onRemove}>
            <Trash2 size={14} /> Remove
          </button>
        </div>
        {!valid && !line.unavailable && <p id={`${inputId}-error`} className="my-3 text-[11px]! text-[#a44545]!" role="alert">
          Enter a whole number between {min} and {max}.
        </p>}
      </div>
      <div className="flex flex-col items-end gap-[3px] text-sm whitespace-nowrap max-[520px]:col-start-2 max-[520px]:flex-row-reverse max-[520px]:items-baseline max-[520px]:justify-between max-[520px]:pt-[5px]"><strong>{money(Number(line.price) * line.quantity)}</strong><span className="text-[9px] text-[#827477] max-[520px]:text-[10px]">Item total</span></div>
    </li>
  );
}
