import populationData from 'country-json/src/country-by-population.json';

export const COUNTRIES = populationData
  .filter(({ population }) => population >= 100000)
  .map(({ country, population }) => ({
    name: country,
    population: +population,
  }));
