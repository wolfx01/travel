const fs = require('fs');
const path = require('path');
const allCities = require('all-the-cities');

// Filter cities with population > 50,000 to ensure they are major cities
const majorCities = allCities.filter(city => city.population > 50000);

// Group by country
const citiesByCountry = {};
majorCities.forEach(city => {
    if (!citiesByCountry[city.country]) {
        citiesByCountry[city.country] = [];
    }
    citiesByCountry[city.country].push(city);
});

// Select top 10 cities per country
let selectedCities = [];
let idCounter = 1;

// Helper to get full country name
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
function getCountryName(code) {
    try {
        return regionNames.of(code);
    } catch (e) {
        return code;
    }
}

Object.keys(citiesByCountry).forEach(countryCode => {
    // Sort by population descending
    const countryCities = citiesByCountry[countryCode].sort((a, b) => b.population - a.population);
    
    // Take top 10
    const top10 = countryCities.slice(0, 10);

    top10.forEach(city => {
        selectedCities.push({
            id: idCounter++,
            name: city.name,
            country: getCountryName(city.country),
            countryCode: city.country,
            population: city.population,
            // Placeholder image for now, as we don't have real images for 2000 cities
            image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400", 
            rating: (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1), // Random rating between 4.0 and 5.0
            description: `A beautiful city in ${getCountryName(city.country)} with a population of ${city.population.toLocaleString()}.`,
            coordinates: city.loc.coordinates
        });
    });
});

// Write to frontend/data/places.json
const outputPath = path.join(__dirname, '../../frontend/data/places.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(selectedCities, null, 2));

console.log(`Successfully generated ${selectedCities.length} cities from ${Object.keys(citiesByCountry).length} countries.`);
console.log(`File saved to: ${outputPath}`);
