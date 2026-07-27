import * as React from "react"

/**
 * Compatibility shim: this codebase (and shadcn/ui docs in general) follows the Radix
 * `asChild` convention, where a single child element is used as the rendered element.
 * The installed "base-nova" shadcn style is built on Base UI, which instead uses a
 * `render` prop taking the target element directly. This helper bridges the two so
 * `asChild` keeps working the way it's documented everywhere.
 */
export function resolveAsChild<P extends { asChild?: boolean; children?: React.ReactNode }>(
  props: P
): Omit<P, "asChild" | "children"> & { render?: React.ReactElement; children?: React.ReactNode } {
  const { asChild, children, ...rest } = props

  if (asChild && React.isValidElement(children)) {
    return { ...rest, render: children as React.ReactElement }
  }

  return { ...rest, children }
}
