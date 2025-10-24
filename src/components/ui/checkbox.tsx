"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(checked || false)
    const isControlled = checked !== undefined

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = event.target.checked
      if (!isControlled) {
        setInternalChecked(newChecked)
      }
      onCheckedChange?.(newChecked)
    }

    const currentValue = isControlled ? checked : internalChecked

    return (
      <div
        className={cn(
          "relative h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 peer",
          className
        )}
        onClick={() => {
          const newChecked = !currentValue
          if (!isControlled) {
            setInternalChecked(newChecked)
          }
          onCheckedChange?.(newChecked)
        }}
        style={{ cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          className="absolute inset-0 opacity-0 cursor-pointer"
          ref={ref}
          checked={currentValue}
          onChange={handleChange}
          {...props}
        />
        {currentValue && (
          <Check className="h-3 w-3 text-primary" />
        )}
      </div>
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox }