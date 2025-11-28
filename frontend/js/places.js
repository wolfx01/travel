document.addEventListener('DOMContentLoaded', () => {
    const placesGrid = document.querySelector('.places-grid');
    const searchInput = document.querySelector('.search input');
    const searchButton = document.querySelector('.search button');
    
    let currentPage = 1;
    const limit = 20;
    let isLoading = false;
    let hasMore = true;
    let allPlaces = []; // Keep track of loaded places

    // Create sentinel for infinite scroll
    const sentinel = document.createElement('div');
    sentinel.id = 'places-sentinel';
    sentinel.style.width = '100%';
    sentinel.style.height = '20px';
    sentinel.style.gridColumn = '1 / -1';
    
    // Initial fetch
    const urlParams = new URLSearchParams(window.location.search);
    const countryParam = urlParams.get('country');
    
    if (countryParam) {
        document.querySelector('.section-header h2').textContent = `Places in ${countryParam}`;
        document.querySelector('.section-header p').textContent = `Explore the best destinations in ${countryParam}`;
    }

    fetchPlaces(currentPage);

    function fetchPlaces(page, searchTerm = '', sort = 'population') {
        if (isLoading || !hasMore) return;
        isLoading = true;

        let url = `http://localhost:3000/places?page=${page}&limit=${limit}&sort=${sort}`;
        if (countryParam) {
            url += `&country=${encodeURIComponent(countryParam)}`;
        }
        if (searchTerm) {
            url += `&search=${encodeURIComponent(searchTerm)}`;
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                const newPlaces = data.places;
                hasMore = data.hasMore;
                
                if (page === 1) {
                    placesGrid.innerHTML = ''; // Clear on first load
                    allPlaces = [];
                    placesGrid.appendChild(sentinel);
                }

                allPlaces = [...allPlaces, ...newPlaces];
                renderPlaces(newPlaces);
                
                currentPage++;
                isLoading = false;

                if (!hasMore) {
                    sentinel.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error loading places:', error);
                isLoading = false;
                if (page === 1) {
                    placesGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: red; padding: 20px;">
                        <h3>Error Loading Places</h3>
                        <p>Could not connect to the server. Please ensure the backend is running.</p>
                        <p>Technical details: ${error.message}</p>
                    </div>`;
                }
            });
    }

    function renderPlaces(places) {
        const fragment = document.createDocumentFragment();
        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

        if (places.length === 0 && currentPage === 1) {
            placesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #333; font-size: 1.2rem;">No places found.</p>';
            return;
        }

        places.forEach(place => {
            const card = document.createElement('div');
            card.className = 'place-card fade-in';
            
            // Convert country code to full name if possible
            let countryName = place.country;
            try {
                countryName = regionNames.of(place.country);
            } catch (e) {
                // Fallback to code if invalid
            }

            card.innerHTML = `
                <img src="${place.image}" alt="${place.name}" class="place-image" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400';">
                <div class="place-info">
                    <h3 class="place-name">${place.name}</h3>
                    <div class="place-location">${countryName}</div>
                    <div class="place-rating">
                        <span class="stars">★</span>
                        <span class="rating-text">(${place.rating}/5)</span>
                    </div>
                    <a href="place-details.html?id=${place.id}" class="view-details-btn">View Details</a>
                </div>
            `;
            fragment.appendChild(card);

            // Always fetch real image from backend to match Countries page behavior
            fetch(`http://localhost:3000/city-image?city=${encodeURIComponent(place.name)}&country=${encodeURIComponent(countryName)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.imageUrl) {
                        const img = card.querySelector('.place-image');
                        if (img) {
                            img.src = data.imageUrl;
                            // Add a nice fade transition if not already handled by CSS
                            img.style.opacity = '0';
                            setTimeout(() => img.style.opacity = '1', 50);
                        }
                    }
                })
                .catch(err => console.error('City image fetch error:', err));
        });

        placesGrid.insertBefore(fragment, sentinel);
        
        // Re-observe sentinel if we added content
        setupInfiniteScroll();
    }

    // Infinite Scroll Observer
    let observer;
    function setupInfiniteScroll() {
        if (observer) observer.disconnect();
        
        observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !isLoading) {
                const searchTerm = searchInput ? searchInput.value.trim() : '';
                fetchPlaces(currentPage, searchTerm, currentSort);
            }
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        });

        observer.observe(sentinel);
    }

    // Search functionality (Client-side filtering of LOADED items for now, or reset and search backend?)
    // For "all cities", client-side search on 4000 items is okay if we loaded them all, but we haven't.
    // Ideally search should hit backend. For now, let's keep it simple:
    // If user searches, we might need a search endpoint. 
    // Given the task scope, I'll disable search or make it alert "Search not implemented for all cities yet" 
    // OR just filter what's on screen.
    // Let's implement a basic backend search later if requested. 
    // For now, I'll leave client-side filter on loaded items but it's imperfect.
    
    function performSearch(e) {
        if (e) e.preventDefault(); 
        const searchTerm = searchInput.value.trim();
        
        // Reset to page 1
        currentPage = 1;
        hasMore = true;
        allPlaces = [];
        placesGrid.innerHTML = '';
        placesGrid.appendChild(sentinel);
        sentinel.style.display = 'block';

        // Update URL with search param (optional but good for UX, maybe later)
        // For now just fetch
        
        fetchPlaces(currentPage, searchTerm, currentSort);
    }

    // Event listeners
    if (searchButton) searchButton.addEventListener('click', performSearch);
    if (searchInput) searchInput.addEventListener('input', performSearch);
    
    const searchForm = document.querySelector('form');
    if (searchForm) {
        searchForm.addEventListener('submit', performSearch);
    }

    // Sorting functionality
    const sortAzBtn = document.getElementById('sort-az');
    const sortPopBtn = document.getElementById('sort-pop');
    const sortRatingBtn = document.getElementById('sort-rating');
    let currentSort = 'population'; // Default

    function setActiveSortButton(btn) {
        [sortAzBtn, sortPopBtn, sortRatingBtn].forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    function handleSort(sortType, btn) {
        setActiveSortButton(btn);
        currentSort = sortType;
        
        // Reset and fetch
        currentPage = 1;
        hasMore = true;
        allPlaces = [];
        placesGrid.innerHTML = '';
        placesGrid.appendChild(sentinel);
        sentinel.style.display = 'block';
        
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        fetchPlaces(currentPage, searchTerm, currentSort);
    }

    if (sortAzBtn) sortAzBtn.addEventListener('click', () => handleSort('name', sortAzBtn));
    if (sortPopBtn) sortPopBtn.addEventListener('click', () => handleSort('population', sortPopBtn));
    if (sortRatingBtn) sortRatingBtn.addEventListener('click', () => handleSort('rating', sortRatingBtn));
});
