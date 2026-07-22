/**
 * Listado estático de regiones/comunas de Chile, usado por el selector
 * región+comuna del cliente (`RegionComunaSelect`) y por el endpoint público
 * `GET /api/regions/enabled` (que filtra esta lista contra la tabla
 * `regions.enabled` de la base de datos).
 *
 * Los códigos de `id` coinciden 1:1 con `regions.id` en la base de datos
 * (ver migración 019_regions.sql).
 *
 * Solo la Región Metropolitana (RM) trae el listado COMPLETO de sus 52
 * comunas, porque es la única región habilitada hoy. Las demás 15 regiones
 * traen únicamente sus comunas principales/más conocidas -- FALTAN comunas
 * menores por completar cuando esas regiones se habiliten en el futuro
 * (Chile tiene ~345 comunas en total).
 */
export interface ChileRegion {
  id: string
  name: string
  comunas: string[]
}

export const CHILE_REGIONS: ChileRegion[] = [
  {
    id: "XV",
    name: "Arica y Parinacota",
    comunas: ["Arica", "Camarones", "Putre", "General Lagos"],
  },
  {
    id: "I",
    name: "Tarapacá",
    comunas: ["Iquique", "Alto Hospicio", "Pozo Almonte", "Pica", "Huara", "Camiña", "Colchane"],
  },
  {
    id: "II",
    name: "Antofagasta",
    comunas: ["Antofagasta", "Mejillones", "Sierra Gorda", "Taltal", "Calama", "Tocopilla", "María Elena", "San Pedro de Atacama"],
  },
  {
    id: "III",
    name: "Atacama",
    comunas: ["Copiapó", "Caldera", "Tierra Amarilla", "Vallenar", "Freirina", "Huasco", "Chañaral", "Diego de Almagro"],
  },
  {
    id: "IV",
    name: "Coquimbo",
    comunas: ["La Serena", "Coquimbo", "Andacollo", "La Higuera", "Paihuano", "Vicuña", "Ovalle", "Illapel", "Salamanca", "Los Vilos"],
  },
  {
    id: "V",
    name: "Valparaíso",
    comunas: [
      "Valparaíso",
      "Viña del Mar",
      "Concón",
      "Quilpué",
      "Villa Alemana",
      "Casablanca",
      "San Antonio",
      "Los Andes",
      "San Felipe",
      "Quillota",
      "La Calera",
      "Isla de Pascua",
    ],
  },
  {
    id: "RM",
    name: "Metropolitana de Santiago",
    comunas: [
      "Santiago",
      "Cerrillos",
      "Cerro Navia",
      "Conchalí",
      "El Bosque",
      "Estación Central",
      "Huechuraba",
      "Independencia",
      "La Cisterna",
      "La Florida",
      "La Granja",
      "La Pintana",
      "La Reina",
      "Las Condes",
      "Lo Barnechea",
      "Lo Espejo",
      "Lo Prado",
      "Macul",
      "Maipú",
      "Ñuñoa",
      "Pedro Aguirre Cerda",
      "Peñalolén",
      "Providencia",
      "Pudahuel",
      "Quilicura",
      "Quinta Normal",
      "Recoleta",
      "Renca",
      "San Joaquín",
      "San Miguel",
      "San Ramón",
      "Vitacura",
      "Puente Alto",
      "Pirque",
      "San José de Maipo",
      "Colina",
      "Lampa",
      "Tiltil",
      "San Bernardo",
      "Buin",
      "Calera de Tango",
      "Paine",
      "Melipilla",
      "Alhué",
      "Curacaví",
      "María Pinto",
      "San Pedro",
      "Talagante",
      "El Monte",
      "Isla de Maipo",
      "Padre Hurtado",
      "Peñaflor",
    ],
  },
  {
    id: "VI",
    name: "Libertador General Bernardo O'Higgins",
    comunas: ["Rancagua", "Machalí", "Graneros", "San Fernando", "Santa Cruz", "Rengo", "Pichilemu"],
  },
  {
    id: "VII",
    name: "Maule",
    comunas: ["Talca", "Curicó", "Linares", "Constitución", "Cauquenes", "Molina", "San Javier"],
  },
  {
    id: "XVI",
    name: "Ñuble",
    comunas: ["Chillán", "Chillán Viejo", "San Carlos", "Bulnes", "Quirihue"],
  },
  {
    id: "VIII",
    name: "Biobío",
    comunas: ["Concepción", "Talcahuano", "Hualpén", "Chiguayante", "San Pedro de la Paz", "Coronel", "Los Ángeles", "Lota"],
  },
  {
    id: "IX",
    name: "La Araucanía",
    comunas: ["Temuco", "Padre Las Casas", "Villarrica", "Angol", "Victoria", "Pucón"],
  },
  {
    id: "XIV",
    name: "Los Ríos",
    comunas: ["Valdivia", "La Unión", "Río Bueno", "Panguipulli"],
  },
  {
    id: "X",
    name: "Los Lagos",
    comunas: ["Puerto Montt", "Puerto Varas", "Osorno", "Castro", "Ancud", "Chiloé", "Frutillar"],
  },
  {
    id: "XI",
    name: "Aysén del General Carlos Ibáñez del Campo",
    comunas: ["Coyhaique", "Puerto Aysén", "Chile Chico", "Cochrane"],
  },
  {
    id: "XII",
    name: "Magallanes y de la Antártica Chilena",
    comunas: ["Punta Arenas", "Puerto Natales", "Porvenir", "Puerto Williams"],
  },
]
