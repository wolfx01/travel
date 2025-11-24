document.addEventListener('DOMContentLoaded', () => {
    const topDestinationsGrid = document.getElementById('top-destinations-grid');

    if (topDestinationsGrid) {
        fetchTopDestinations();
    }

    async function fetchTopDestinations() {
        try {
            const response = await fetch('http://localhost:3000/countries');
            if (!response.ok) throw new Error('Failed to fetch countries');
            
            const allCountries = await response.json();

            const targetCountries = [
                "France",
                "Spain",
                "United States",
                "Italy",
                "Turkey",
                "Japan"
            ];

            // Filter and sort to match the order in targetCountries
            const top6 = targetCountries.map(name => 
                allCountries.find(c => c.name.common === name)
            ).filter(Boolean); // Remove any undefined if not found

            topDestinationsGrid.innerHTML = ''; // Clear loading/placeholder

            top6.forEach(country => {
                const card = createCountryCard(country);
                topDestinationsGrid.appendChild(card);
            });

        } catch (error) {
            console.error('Error loading top destinations:', error);
            topDestinationsGrid.innerHTML = '<p style="color: red; text-align: center;">Failed to load top destinations.</p>';
        }
    }

    function createCountryCard(country) {
        const name = country.name.common;
        const capital = country.capital ? country.capital[0] : 'N/A';
        const population = formatNumber(country.population);
        const area = country.area ? formatNumber(country.area) + ' km²' : 'N/A';
        
        // Default fallback image
        const fallbackImage = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400';

        const card = document.createElement('div');
        card.className = 'country-card fade-in';
        
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
                <p class="country-description">Discover the beauty and culture of ${name}.</p>
                <button class="explore-btn">Explore ${name}</button>
            </div>
        `;

        // Fetch real image from backend
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

    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
});
