import {
  Waves,
  Dumbbell,
  Users,
  Flame,
  Bike,
  Car,
  ShieldCheck,
  ArrowUpDown,
  WashingMachine,
  PartyPopper,
  Laptop,
  Building2,
  Baby,
  PawPrint,
  Clapperboard,
  TrainFront,
  ShoppingBag,
  GraduationCap,
  Trees,
  type LucideIcon,
} from "lucide-react"

import type { PropertyAmenity } from "@/lib/property-amenities"

/** Ícono lucide-react por cada valor de `PROPERTY_AMENITIES` -- usado tanto
 * en el formulario de carga de propiedades (admin) como en los badges con
 * tooltip del carrusel de propiedades (cliente). */
export const AMENITY_ICONS: Record<PropertyAmenity, LucideIcon> = {
  piscina: Waves,
  gimnasio: Dumbbell,
  areas_comunes: Users,
  quincho: Flame,
  bicicletero: Bike,
  estacionamiento: Car,
  conserjeria: ShieldCheck,
  ascensor: ArrowUpDown,
  lavanderia: WashingMachine,
  salon_eventos: PartyPopper,
  coworking: Laptop,
  rooftop: Building2,
  juegos_infantiles: Baby,
  pet_friendly: PawPrint,
  sala_cine: Clapperboard,
  cerca_metro: TrainFront,
  cerca_comercio: ShoppingBag,
  cerca_colegios: GraduationCap,
  cerca_parques: Trees,
}
