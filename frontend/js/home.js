document.addEventListener('DOMContentLoaded', () => {
    fetchTopDestinations();
    fetchTopPlaces();
});

async function fetchTopDestinations() {
    const grid = document.getElementById('top-destinations-grid');
    try {
        const response = await fetch('http://localhost:3000/countries');
        if (!response.ok) throw new Error('Failed to fetch countries');
        
        let countries = await response.json();
        
        // Assign random ratings if missing (same logic as countries.js)
        countries.forEach(country => {
            if (!country.rating) {
                country.rating = (Math.random() * 2 + 3).toFixed(1);
            }
        });

        // Sort by rating desc and take top 6
        const topCountries = countries.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating)).slice(0, 6);

        grid.innerHTML = '';
        topCountries.forEach(country => {
            const card = createCountryCard(country);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading top destinations:', error);
        grid.innerHTML = '<p style="text-align: center; width: 100%; grid-column: 1/-1;">Failed to load top destinations.</p>';
    }
}

async function fetchTopPlaces() {
    const grid = document.getElementById('top-places-grid');
    try {
        // Fetch top 6 places sorted by rating
        const response = await fetch('http://localhost:3000/places?limit=6&sort=rating');
        if (!response.ok) throw new Error('Failed to fetch places');
        
        const data = await response.json();
        const places = data.places;

        grid.innerHTML = '';
        places.forEach(place => {
            const card = createPlaceCard(place);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading top places:', error);
        grid.innerHTML = '<p style="text-align: center; width: 100%; grid-column: 1/-1;">Failed to load top places.</p>';
    }
}

function createCountryCard(country) {
    const name = country.name.common;
    const capital = country.capital ? country.capital[0] : 'N/A';
    const population = formatNumber(country.population);
    const area = country.area ? formatNumber(country.area) + ' km²' : 'N/A';
    const fallbackImage = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400';

    const card = document.createElement('div');
    card.className = 'country-card fade-in'; // Use exact class from countries.js
    
    card.innerHTML = `
        <div class="country-image-container">
            <img src="${fallbackImage}" alt="${name}" class="country-image" loading="lazy">
        </div>
        <div class="country-info">
            <h3 class="country-name">${name}</h3>
            <div class="country-capital">Capital: ${capital}</div>
            <div class="country-stats">
                <div class="stat">
                    <div class="stat-label">Population</div>
                    <div class="stat-value">${population}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Area</div>
                    <div class="stat-value">${area}</div>
                </div>
            </div>
            <div class="country-rating" style="margin-top: 10px; color: #f1c40f;">
                <span class="stars">★</span>
                <span class="rating-text">(${country.rating}/5)</span>
            </div>
            <p class="country-description">Discover the beauty and culture of ${name}.</p>
            <a href="pages/places.html?country=${encodeURIComponent(name)}" class="explore-btn" style="text-decoration: none; text-align: center; display: block;">Explore ${name}</a>
        </div>
    `;

    // Fetch dynamic image
    fetch(`http://localhost:3000/country-image?country=${encodeURIComponent(name)}`)
        .then(res => res.json())
        .then(data => {
            if (data.imageUrl) {
                const img = card.querySelector('.country-image');
                if (img) img.src = data.imageUrl;
            }
        })
        .catch(err => console.error('Image fetch error:', err));

    return card;
}

function createPlaceCard(place) {
    const card = document.createElement('div');
    card.className = 'place-card fade-in'; // Use exact class from places.js

    const fallbackImage = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400';
    
    // Helper for country name (simplified version of places.js logic)
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    let countryName = place.country;
    try {
        countryName = regionNames.of(place.country);
    } catch (e) {}

    card.innerHTML = `
        <img src="${place.image || fallbackImage}" alt="${place.name}" class="place-image" loading="lazy" onerror="this.onerror=null; this.src='${fallbackImage}';">
        <div class="place-info">
            <h3 class="place-name">${place.name}</h3>
            <div class="place-location">${countryName}</div>
            <div class="place-rating">
                <span class="stars">★</span>
                <span class="rating-text">(${place.rating}/5)</span>
            </div>
            <a href="pages/place-details.html?id=${place.id}" class="view-details-btn">View Details</a>
        </div>
    `;

    // Fetch dynamic image
    fetch(`http://localhost:3000/city-image?city=${encodeURIComponent(place.name)}&country=${encodeURIComponent(countryName)}`)
        .then(res => res.json())
        .then(data => {
            if (data.imageUrl) {
                const img = card.querySelector('.place-image');
                if (img) {
                    img.src = data.imageUrl;
                    img.style.opacity = '0';
                    setTimeout(() => img.style.opacity = '1', 50);
                }
            }
        })
        .catch(err => console.error('City image fetch error:', err));

    return card;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}
