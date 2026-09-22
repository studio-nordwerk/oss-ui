// The five blocks exactly as `shadcn add` installs them, rendered for the docs page.
import { createRoot } from "react-dom/client"

import { BrandTeasers } from "../../registry/blocks/brand-teasers"
import { HeroAutoplay } from "../../registry/blocks/hero-autoplay"
import { ImageGallery } from "../../registry/blocks/image-gallery"
import { LogoBelt } from "../../registry/blocks/logo-belt"
import { ProductRow } from "../../registry/blocks/product-row"

const blocks = [
  ["hero-autoplay", HeroAutoplay],
  ["product-row", ProductRow],
  ["brand-teasers", BrandTeasers],
  ["image-gallery", ImageGallery],
  ["logo-belt", LogoBelt],
] as const

function Preview() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 p-4 sm:p-6">
      {blocks.map(([name, Block]) => (
        <section key={name} className="flex flex-col gap-3" aria-label={name}>
          <p className="font-mono text-xs text-muted-foreground">{name}</p>
          <Block />
        </section>
      ))}
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<Preview />)

// Tell the page around the iframe how tall this is, so it never needs its own scrollbar.
const report = () => parent.postMessage({ frameHeight: document.body.getBoundingClientRect().height }, "*")
new ResizeObserver(report).observe(document.body)
document.addEventListener("click", (event) => {
  if ((event.target as Element).closest('a[href="#"]')) event.preventDefault()
})
