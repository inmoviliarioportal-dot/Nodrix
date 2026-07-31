import { Bath, BedDouble, Building2, Heart, MapPin } from "lucide-react"

interface PropertyCardProps {
  src: string
  title: string
  tag: "Para vivir" | "Para inversión"
  location: string
  price: string
  type: string
  rooms: number
  baths: number
  delay?: number
}

/**
 * Card de propiedad para "Oportunidades para ti" — imagen con badge de
 * destino (vivir/inversión) y botón de favorito, ficha con precio en UF y
 * metadatos (tipo, dormitorios, baños), replicando el mockup de referencia.
 */
function PropertyCard({
  src,
  title,
  tag,
  location,
  price,
  type,
  rooms,
  baths,
  delay = 0,
}: PropertyCardProps) {
  return (
    <div
      className="glass-card interactive-lift animate-fade-in-up flex flex-col overflow-hidden rounded-2xl p-0"
      style={{ "--animate-delay": `${delay}ms` } as React.CSSProperties}
    >
      <div className="relative">
        <img src={src} alt={title} className="h-[170px] w-full object-cover" />
        <span className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-neon-cyan shadow-sm">
          {tag}
        </span>
        <span className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-white/95 text-text-tertiary shadow-sm">
          <Heart className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="flex flex-col gap-1.5 p-[18px]">
        <span className="font-heading text-[15px] font-bold text-text-primary">{title}</span>
        <span className="flex items-center gap-1 text-xs text-text-tertiary">
          <MapPin className="size-3.5" aria-hidden="true" />
          {location}
        </span>
        <span className="font-heading mt-0.5 text-lg font-semibold text-neon-cyan">{price}</span>
        <div className="mt-1 flex items-center gap-4 border-t border-glass-border pt-2 text-xs text-text-tertiary">
          <span className="flex items-center gap-1">
            <Building2 className="size-3.5" aria-hidden="true" />
            {type}
          </span>
          <span className="flex items-center gap-1">
            <BedDouble className="size-3.5" aria-hidden="true" />
            {rooms}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="size-3.5" aria-hidden="true" />
            {baths}
          </span>
        </div>
      </div>
    </div>
  )
}

export { PropertyCard }
