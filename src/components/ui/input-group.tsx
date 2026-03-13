"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function InputGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "flex items-center rounded-lg border border-input bg-background shadow-xs",
        className
      )}
      {...props}
    />
  )
}

function InputGroupAddon({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn(
        "flex items-center px-2.5 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { InputGroup, InputGroupAddon }
