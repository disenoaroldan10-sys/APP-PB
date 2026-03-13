export interface City {
  name: string;
  lat: number;
  lon: number;
}

export interface Country {
  name: string;
  cities: City[];
}

export const countriesData: Country[] = [
  {
    name: "Colombia",
    cities: [
      { name: "Bogotá", lat: 4.6097, lon: -74.0817 },
      { name: "Medellín", lat: 6.2442, lon: -75.5812 },
      { name: "Cali", lat: 3.4516, lon: -76.5320 },
      { name: "Barranquilla", lat: 10.9639, lon: -74.7964 },
      { name: "Cartagena", lat: 10.3910, lon: -75.4794 },
      { name: "Bucaramanga", lat: 7.1193, lon: -73.1227 },
      { name: "Pereira", lat: 4.8133, lon: -75.6961 },
      { name: "Santa Marta", lat: 11.2404, lon: -74.1990 },
      { name: "Ibagué", lat: 4.4389, lon: -75.2322 },
      { name: "Cúcuta", lat: 7.8939, lon: -72.5078 }
    ]
  },
  {
    name: "México",
    cities: [
      { name: "Ciudad de México", lat: 19.4326, lon: -99.1332 },
      { name: "Guadalajara", lat: 20.6597, lon: -103.3496 },
      { name: "Monterrey", lat: 25.6866, lon: -100.3161 },
      { name: "Cancún", lat: 21.1619, lon: -86.8515 }
    ]
  },
  {
    name: "España",
    cities: [
      { name: "Madrid", lat: 40.4168, lon: -3.7038 },
      { name: "Barcelona", lat: 41.3851, lon: 2.1734 },
      { name: "Sevilla", lat: 37.3891, lon: -5.9845 },
      { name: "Valencia", lat: 39.4699, lon: -0.3763 }
    ]
  },
  {
    name: "Argentina",
    cities: [
      { name: "Buenos Aires", lat: -34.6037, lon: -58.3816 },
      { name: "Córdoba", lat: -31.4135, lon: -64.1811 },
      { name: "Rosario", lat: -32.9468, lon: -60.6393 }
    ]
  },
  {
    name: "Chile",
    cities: [
      { name: "Santiago", lat: -33.4489, lon: -70.6693 },
      { name: "Valparaíso", lat: -33.0472, lon: -71.6127 }
    ]
  },
  {
    name: "Perú",
    cities: [
      { name: "Lima", lat: -12.0464, lon: -77.0428 },
      { name: "Arequipa", lat: -16.4090, lon: -71.5375 }
    ]
  },
  {
    name: "Ecuador",
    cities: [
      { name: "Quito", lat: -0.1807, lon: -78.4678 },
      { name: "Guayaquil", lat: -2.1710, lon: -79.9224 }
    ]
  }
];
