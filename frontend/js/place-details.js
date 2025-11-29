document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const placeId = urlParams.get('id');

    if (!placeId) {
        // Redirect to places page if no ID provided
        window.location.href = 'places.html';
        return;
    }

    fetchPlaceDetails(placeId);

    async function fetchPlaceDetails(id) {
        console.log(`Fetching details for place ID: ${id}`);
        try {
            const response = await fetch(`https://travel-backend-gamma-ten.vercel.app/places/${id}`);
            console.log(`Response status: ${response.status}`);
            if (!response.ok) throw new Error('Failed to fetch place details');
            
            const place = await response.json();
            renderPlaceDetails(place);
        } catch (error) {
            console.error('Error:', error);
            document.querySelector('.place-details-container').innerHTML = 
                '<div style="text-align: center; padding: 50px; color: red;">Failed to load place details.</div>';
        }
    }

    function renderPlaceDetails(place) {
        // Update page title
        document.title = `${place.name} - Travel Details`;

        // Update Hero Section
        const heroImage = document.querySelector('.hero-image');
        const heroTitle = document.querySelector('.hero-text h1');
        const heroLocation = document.querySelector('.hero-text p');

        if (heroTitle) heroTitle.textContent = place.name;
        if (heroLocation) heroLocation.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${place.countryName}`;

        // Fetch dynamic image for hero
        fetch(`https://travel-backend-gamma-ten.vercel.app/city-image?city=${encodeURIComponent(place.name)}&country=${encodeURIComponent(place.countryName)}`)
            .then(res => res.json())
            .then(data => {
                if (data.imageUrl && heroImage) {
                    heroImage.src = data.imageUrl;
                }
            })
            .catch(err => console.error('Image fetch error:', err));

        // Update Info Section
        const descriptionTitle = document.querySelector('.place-description h2');
        const descriptionText = document.querySelector('.place-description p');
        
        if (descriptionTitle) descriptionTitle.textContent = `About ${place.name}`;
        if (descriptionText) descriptionText.textContent = place.description;

        // Update Details List
        const detailsList = document.querySelector('.place-meta ul');
        if (detailsList) {
            detailsList.innerHTML = `
                <li><strong>Country:</strong> ${place.countryName}</li>
                <li><strong>Population:</strong> ${place.population.toLocaleString()}</li>
                <li><strong>Language:</strong> ${place.language || 'N/A'}</li>
                <li><strong>Currency:</strong> ${place.currency || 'N/A'}</li>
                <li><strong>Rating:</strong> ${place.rating}/5</li>
            `;
        }

        // Update Map
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <iframe 
                    width="100%" 
                    height="400" 
                    frameborder="0" 
                    scrolling="no" 
                    marginheight="0" 
                    marginwidth="0" 
                    src="https://maps.google.com/maps?q=${encodeURIComponent(place.name + ', ' + place.countryName)}&t=&z=13&ie=UTF8&iwloc=&output=embed">
                </iframe>
            `;
        }

        // Fetch Gallery Images (City + Country specific)
        fetch(`https://travel-backend-gamma-ten.vercel.app/place-gallery?query=${encodeURIComponent(place.name + ' ' + place.countryName + ' tourism')}`)
            .then(res => res.json())
            .then(data => {
                const galleryGrid = document.querySelector('.gallery-grid');
                if (data.images && data.images.length > 0 && galleryGrid) {
                    galleryGrid.innerHTML = ''; // Clear placeholders
                    
                    // Create track for animation
                    const track = document.createElement('div');
                    track.className = 'gallery-track';
                    
                    // Duplicate images to ensure smooth scrolling if few images
                    // We need enough copies to fill the screen width at least twice
                    const imagesToShow = [...data.images, ...data.images, ...data.images, ...data.images]; 
                    
                    imagesToShow.forEach(imgUrl => {
                        const img = document.createElement('img');
                        img.src = imgUrl;
                        img.alt = `Gallery image of ${place.countryName}`;
                        track.appendChild(img);
                    });
                    
                    galleryGrid.appendChild(track);
                }
            })
            .catch(err => console.error('Gallery fetch error:', err));
           

        // Fetch Comments
        fetchComments(place.id);
    }

    // Handle Comment Submission
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Check if user is logged in (simple check via localStorage or cookie presence)
            // For better security, backend should verify token, but here we just need the name
            // We can try to get it from localStorage 'userName' set during login
            const userName = localStorage.getItem('userName');
            
            if (!userName) {
                alert("Please log in to leave a comment.");
                window.location.href = '../auth/login.html';
                return;
            }

            const text = document.getElementById('commentText').value;
            const placeId = new URLSearchParams(window.location.search).get('id');

            try {
                const response = await fetch('https://travel-backend-gamma-ten.vercel.app/comments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ placeId, userName, text })
                });

                if (response.ok) {
                    document.getElementById('commentText').value = ''; // Clear textarea
                    fetchComments(placeId); // Reload comments
                } else {
                    alert('Failed to post comment');
                }
            } catch (error) {
                console.error('Error posting comment:', error);
            }
        });
    }

    async function fetchComments(placeId) {
        try {
            const response = await fetch(`https://travel-backend-gamma-ten.vercel.app/comments/${placeId}`);
            const comments = await response.json();
            
            const commentsList = document.getElementById('comments-list');
            if (commentsList) {
                if (comments.length === 0) {
                    commentsList.innerHTML = '<p>No comments yet. Be the first to share your thoughts!</p>';
                    return;
                }

                commentsList.innerHTML = comments.map(comment => `
                    <div class="review-card">
                        <div class="review-header">
                            <div class="avatar">
                                ${comment.userName.charAt(0).toUpperCase()}
                            </div>
                            <div class="author-info">
                                <h4>${comment.userName} <i class="fas fa-check-circle verified-badge"></i></h4>
                                <small>${new Date(comment.date).toLocaleDateString()}</small>
                            </div>
                        </div>
                        <div class="review-body">
                            <p class="review-text">${comment.text}</p>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }
});
