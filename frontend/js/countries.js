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
            const response = await fetch('https://travel-backend-gamma-ten.vercel.app/countries');
            if (!response.ok) throw new Error('Failed to fetch countries');
            
            allCountries = await response.json();

            // Assign random ratings
            allCountries.forEach(country => {
                country.rating = (Math.random() * 2 + 3).toFixed(1); // 3.0 to 5.0
            });

            // Sort alphabetically by default
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
                <div class="country-rating" style="margin-top: 10px; color: #f1c40f;">
                    <span class="stars">★</span>
                    <span class="rating-text">(${country.rating}/5)</span>
                </div>
                <p class="country-description">Discover the beauty and culture of ${name}.</p>
                <a href="places.html?country=${encodeURIComponent(name)}" class="explore-btn" style="text-decoration: none; text-align: center; display: block;">Explore ${name}</a>
            </div>
        `;

        // Fetch real image from backend
        fetch(`https://travel-backend-gamma-ten.vercel.app/country-image?country=${encodeURIComponent(name)}`)
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

    // Search functionality
    const searchInput = document.querySelector('.search input');
    const searchButton = document.querySelector('.search button');
    const searchForm = document.querySelector('form');

    function performSearch(e) {
        if (e) e.preventDefault();
        const searchTerm = searchInput.value.toLowerCase().trim();

        // Filter countries
        const filteredCountries = allCountries.filter(country => 
            country.name.common.toLowerCase().includes(searchTerm)
        );

        // Reset grid and render filtered results
        placesGrid.innerHTML = '';
        
        if (filteredCountries.length === 0) {
            placesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #333; font-size: 1.2rem;">No countries found.</p>';
            return;
        }

        // We can reuse render logic or just render all filtered since client-side search usually returns manageable set
        // But to keep infinite scroll logic simple, let's just render all matches if searching, 
        // or we'd need to complexify the state. For simplicity in this task: render all matches.
        
        const fragment = document.createDocumentFragment();
        filteredCountries.forEach(country => {
            const card = createCountryCardElement(country);
            fragment.appendChild(card);
        });
        placesGrid.appendChild(fragment);
        
        // Hide sentinel when searching to disable infinite scroll on filtered list (simple approach)
        sentinel.style.display = 'none';
    }

    if (searchButton) searchButton.addEventListener('click', performSearch);
    if (searchInput) searchInput.addEventListener('input', performSearch);
    if (searchForm) searchForm.addEventListener('submit', performSearch);

    // Sorting functionality
    const sortAzBtn = document.getElementById('sort-az');
    const sortPopBtn = document.getElementById('sort-pop');
    const sortRatingBtn = document.getElementById('sort-rating');

    function setActiveSortButton(btn) {
        [sortAzBtn, sortPopBtn, sortRatingBtn].forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    function renderSortedCountries() {
        placesGrid.innerHTML = '';
        placesGrid.appendChild(sentinel);
        
        // Reset infinite scroll
        displayedCount = 0;
        sentinel.style.display = 'block';
        renderNextBatch();
    }

    if (sortAzBtn) {
        sortAzBtn.addEventListener('click', () => {
            setActiveSortButton(sortAzBtn);
            allCountries.sort((a, b) => a.name.common.localeCompare(b.name.common));
            renderSortedCountries();
        });
    }

    if (sortPopBtn) {
        sortPopBtn.addEventListener('click', () => {
            setActiveSortButton(sortPopBtn);
            allCountries.sort((a, b) => b.population - a.population);
            renderSortedCountries();
        });
    }

    if (sortRatingBtn) {
        sortRatingBtn.addEventListener('click', () => {
            setActiveSortButton(sortRatingBtn);
            allCountries.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
            renderSortedCountries();
        });
    }
});
