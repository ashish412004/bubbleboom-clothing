'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export interface CartQuantityControlProps {
  quantity: number
  maxStock: number
  onIncrease: () => void
  onDecrease: () => void
  disabled?: boolean
  size?: 'sm' | 'md'
  itemTitle?: string
  className?: string
}

export function CartQuantityControl({
  quantity,
  maxStock,
  onIncrease,
  onDecrease,
  disabled = false,
  size = 'md',
  itemTitle = 'Item',
  className = '',
}: CartQuantityControlProps) {
  const [animDirection, setAnimDirection] = useState<'up' | 'down' | null>(null)
  const prevQuantityRef = useRef(quantity)

  useEffect(() => {
    if (quantity > prevQuantityRef.current) {
      setAnimDirection('up')
    } else if (quantity < prevQuantityRef.current) {
      setAnimDirection('down')
    }
    prevQuantityRef.current = quantity
  }, [quantity])

  const isAtMaxStock = typeof maxStock === 'number' && maxStock > 0 && quantity >= maxStock
  const isAtMinQuantity = quantity <= 1

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return

    if (isAtMaxStock) {
      toast.error(`Maximum available stock reached (${maxStock})`, {
        id: `max-stock-${itemTitle}`,
        style: {
          background: '#000000',
          color: '#FFFFFF',
          fontSize: '12px',
          fontFamily: 'monospace',
          borderRadius: '0px',
          border: '1px solid #333',
        },
      })
      return
    }

    onIncrease()
  }

  const handleMinusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    onDecrease()
  }

  // Size classes
  const btnClasses =
    size === 'sm'
      ? 'w-8 h-8 text-xs min-h-[36px] min-w-[36px] sm:min-h-[32px] sm:min-w-[32px]'
      : 'w-9 h-9 sm:w-10 sm:h-10 text-xs sm:text-sm min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px]'

  const numWidthClass = size === 'sm' ? 'w-8 text-xs' : 'w-9 sm:w-10 text-xs sm:text-sm'
  const iconSize = size === 'sm' ? 12 : 14

  return (
    <div
      className={`inline-flex items-center border border-neutral-300 rounded-[2px] bg-white shadow-2xs select-none touch-manipulation ${className}`}
      role="group"
      aria-label={`Quantity selector for ${itemTitle}`}
    >
      {/* Minus Button */}
      <button
        type="button"
        onClick={handleMinusClick}
        disabled={disabled}
        aria-label={
          isAtMinQuantity
            ? `Remove ${itemTitle} from bag`
            : `Decrease quantity of ${itemTitle}`
        }
        title={
          isAtMinQuantity
            ? 'Remove item from bag'
            : 'Decrease quantity'
        }
        className={`${btnClasses} flex items-center justify-center font-bold transition-all duration-150 active:scale-[0.94] disabled:opacity-30 disabled:pointer-events-none ${
          isAtMinQuantity
            ? 'text-neutral-500 hover:text-[#DC2626] hover:bg-red-50/80 active:bg-red-100'
            : 'text-neutral-800 hover:text-black hover:bg-neutral-100 active:bg-neutral-200'
        }`}
      >
        {isAtMinQuantity ? (
          <Trash2
            size={iconSize}
            className="transition-colors group-hover:text-[#DC2626]"
          />
        ) : (
          <Minus size={iconSize} />
        )}
      </button>

      {/* Quantity Display with Animated Up/Down Number */}
      <div
        className={`${numWidthClass} h-full flex items-center justify-center overflow-hidden border-x border-neutral-200/80 bg-neutral-50/50`}
        aria-live="polite"
      >
        <span
          key={quantity}
          className={`font-mono font-bold tabular-nums text-black leading-none ${
            animDirection === 'up'
              ? 'animate-qty-up'
              : animDirection === 'down'
              ? 'animate-qty-down'
              : ''
          }`}
        >
          {quantity}
        </span>
      </div>

      {/* Plus Button */}
      <button
        type="button"
        onClick={handlePlusClick}
        disabled={disabled || isAtMaxStock}
        aria-label={
          isAtMaxStock
            ? `Maximum available stock reached for ${itemTitle}`
            : `Increase quantity of ${itemTitle}`
        }
        title={
          isAtMaxStock
            ? `Max available stock: ${maxStock}`
            : 'Increase quantity'
        }
        className={`${btnClasses} flex items-center justify-center font-bold text-neutral-800 transition-all duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 active:bg-neutral-200 hover:text-black`}
      >
        <Plus size={iconSize} />
      </button>
    </div>
  )
}
