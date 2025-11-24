document.addEventListener('DOMContentLoaded', () => {
    const placesGrid = document.querySelector('.places-grid');

    let displayedCount = 0;
    const BATCH_SIZE = 8;
    let isLoading = false;

    // Create sentinel for infinite scroll
    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.style.width = '100%';
    sentinel.style.height = '20px';
    sentinel.style.gridColumn = '1 / -1';
    
    // Data will be fetched from backend
    let allCountries = [];

    fetchCountries();

    async function fetchCountries() {
        try {
            const response = await fetch('http://localhost:3000/countries');
            if (!response.ok) throw new Error('Failed to fetch countries');
            
            allCountries = await response.json();

            // Sort alphabetically
            allCountries.sort((a, b) => a.name.common.localeCompare(b.name.common));

            // Clear loading state and start rendering
            placesGrid.innerHTML = '';
            placesGrid.appendChild(sentinel);
            
            // Initial render
            renderNextBatch();

            // Setup Intersection Observer
            setupInfiniteScroll();

        } catch (error) {
            console.error('Error loading countries:', error);
            placesGrid.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1/-1; color: red;">Failed to load countries. Please try again later.</div>';
        }
    }

    function renderNextBatch() {
        if (isLoading || displayedCount >= allCountries.length) return;
        
        isLoading = true;
        const fragment = document.createDocumentFragment();
        const nextBatch = allCountries.slice(displayedCount, displayedCount + BATCH_SIZE);

        nextBatch.forEach(country => {
            const card = createCountryCardElement(country);
            fragment.appendChild(card);
        });

        // Insert before the sentinel
        placesGrid.insertBefore(fragment, sentinel);
        
        displayedCount += nextBatch.length;
        isLoading = false;

        // If we reached the end, hide sentinel
        if (displayedCount >= allCountries.length) {
            sentinel.style.display = 'none';
        }
    }

    function setupInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                // Add a small delay for smoother UX or to simulate loading
                setTimeout(() => {
                    renderNextBatch();
                }, 300);
            }
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        });

        observer.observe(sentinel);
    }

    function createCountryCardElement(country) {
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
