// The eight blocks exactly as `shadcn add` installs them, rendered for the docs page.
import { createRoot } from "react-dom/client"

import { ContactDialog } from "../../registry/blocks/contact-dialog"
import { DrawerDemo } from "../../registry/blocks/drawer-demo"
import { FilterDrawer } from "../../registry/blocks/filter-drawer"
import { Lightbox } from "../../registry/blocks/lightbox"
import { MiniCart } from "../../registry/blocks/mini-cart"
import { MobileMenu } from "../../registry/blocks/mobile-menu"
import { SizePicker } from "../../registry/blocks/size-picker"
import { StoreFinder } from "../../registry/blocks/store-finder"

const blocks = [
  ["size-picker", SizePicker],
  ["filter-drawer", FilterDrawer],
  ["mini-cart", MiniCart],
  ["store-finder", StoreFinder],
  ["mobile-menu", MobileMenu],
  ["contact-dialog", ContactDialog],
  ["lightbox", Lightbox],
  ["drawer-demo", DrawerDemo],
] as const

function Preview() {
  return (
    <main className="grid gap-4 p-7 sm:grid-cols-2">
      {blocks.map(([name, Block]) => (
        <section
          key={name}
          className="flex flex-col items-start gap-3 rounded-xl border bg-card p-4"
          aria-label={name}
        >
          <p className="font-mono text-xs text-muted-foreground">{name}</p>
          <Block />
        </section>
      ))}
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<Preview />)

// Tell the page around the iframe how tall this is, so it never needs its own scrollbar.
const report = () =>
  parent.postMessage({ frameHeight: document.body.getBoundingClientRect().height }, "*")
new ResizeObserver(report).observe(document.body)
document.addEventListener("click", (event) => {
  if ((event.target as Element).closest('a[href="#"]')) event.preventDefault()
})
