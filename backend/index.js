const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
require('dotenv').config();

const db = require('./db')
const User = require('./models/user')
const cors = require("cors");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true
}));
app.use(cookieParser());


app.use(express.urlencoded({ extended: true }));
app.use(express.json())

const countriesData = require('./data/countries.json');
const cities = require('all-the-cities');
// Assign a stable ID to each city based on its index in the master array
cities.forEach((city, index) => {
  city.id = index;
});

const curatedPlaces = require('./data/places.json');

// Create a map for faster lookup of curated places
// Create a map for faster lookup of curated places
const curatedPlacesMap = new Map(curatedPlaces.map(p => [p.name.toLowerCase(), p]));

// Create a map of Country Name -> Country Code
const countryNameMap = new Map();
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const uniqueCountryCodes = [...new Set(cities.map(c => c.country))];

uniqueCountryCodes.forEach(code => {
  try {
    const name = regionNames.of(code);
    if (name) {
      countryNameMap.set(name.toLowerCase(), code);
    }
  } catch (e) {
    // Ignore invalid codes
  }
});

app.get('/places', (req, res) => {
  console.log(`GET /places request received. Page: ${req.query.page}, Limit: ${req.query.limit}, Country: ${req.query.country}, Search: ${req.query.search}, Sort: ${req.query.sort}`);
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const countryFilter = req.query.country;
    const startIndex = (page - 1) * limit;

    let filteredCities = cities;

    // Filter by country if provided
    if (countryFilter) {
      const countryCode = countryNameMap.get(countryFilter.toLowerCase());
      if (countryCode) {
        filteredCities = cities.filter(city => city.country === countryCode);
      } else {
        // If country not found, return empty or handle gracefully
        // For now, let's return empty if the country name is invalid
        filteredCities = []; 
      }
    }

    // Filter by search term if provided
    const searchTerm = req.query.search;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredCities = filteredCities.filter(city => city.name.toLowerCase().includes(lowerSearch));
    }

    // Filter cities with population > 100,000 to get major cities (unless filtered by country, maybe show smaller ones too? Let's keep 100k for consistency for now, or lower it for specific countries if needed. Let's stick to 100k for now to avoid noise)
    // Actually, for specific country view, user might want to see more cities. Let's lower threshold to 10000 if country is selected.
    // Filter cities with population > 100,000 to get major cities (unless filtered by country, maybe show smaller ones too? Let's keep 100k for consistency for now, or lower it for specific countries if needed. Let's stick to 100k for now to avoid noise)
    // Actually, for specific country view, user might want to see more cities. Let's lower threshold to 10000 if country is selected.
    const populationThreshold = countryFilter ? 10000 : 100000;
    let bigCities = filteredCities.filter(city => city.population > populationThreshold);
    
    // Helper for stable random ratings
    function getStableRating(name) {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return ((Math.abs(hash) % 21) / 10 + 3).toFixed(1); // 3.0 to 5.0
    }

    // Map to include ratings for sorting
    let mappedCities = bigCities.map(city => {
      const curated = curatedPlacesMap.get(city.name.toLowerCase());
      return {
        ...city,
        rating: curated ? curated.rating : getStableRating(city.name),
        isCurated: !!curated,
        curatedData: curated
      };
    });

    // Sort
    const sortParam = req.query.sort || 'population'; // default to population
    if (sortParam === 'name') {
      mappedCities.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortParam === 'rating') {
      mappedCities.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else {
      // population
      mappedCities.sort((a, b) => b.population - a.population);
    }

    const paginatedCities = mappedCities.slice(startIndex, startIndex + limit);

    const places = paginatedCities.map((city) => {
      return {
        id: city.id, // Use the stable ID assigned at startup
        name: city.name,
        country: city.country, // This is the 2-letter code
        population: city.population,
        rating: city.rating,
        image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400',
        description: city.isCurated ? city.curatedData.description : `A beautiful city in ${city.country} with a population of ${city.population.toLocaleString()}.`
      };
    });

    res.json({
      places: places,
      total: bigCities.length,
      hasMore: startIndex + limit < bigCities.length
    });
  } catch (error) {
    console.error("Error fetching places:", error);
    res.status(500).json({ error: "Failed to fetch places" });
  }
});

// In-memory cache for place details
const placeDetailsCache = new Map();

async function fetchPlaceDetailsFromGemini(city, country) {
  console.log(`[Gemini] Fetching details for ${city}, ${country}...`);
  if (!process.env.GEMINI_API_KEY) {
    console.error("[Gemini] Error: Missing API Key");
    return { error: "Missing API Key" };
  }

  const cacheKey = `details_${city}_${country}`.toLowerCase();
  if (placeDetailsCache.has(cacheKey)) {
    console.log("[Gemini] Returning cached details");
    return placeDetailsCache.get(cacheKey);
  }

  try {
    const prompt = `Provide the following details for ${city}, ${country} in JSON format:
    {
      "language": "The primary language spoken",
      "currency": "The currency used (e.g. Euro, USD)",
      "description": "A captivating 2-sentence travel description"
    }
    Only return the JSON object, no markdown.`;

    console.log("[Gemini] Sending request to API...");
    // Using gemini-2.0-flash as successfully tested by the user
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    console.log(`[Gemini] Response status: ${response.status}`);
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Gemini] API Error: ${errorText}`);
        try {
            const errorJson = JSON.parse(errorText);
            return { error: `API Error: ${errorJson.error.message || errorText}` };
        } catch (e) {
            return { error: `API Error: ${errorText}` };
        }
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error("[Gemini] Unexpected response structure");
        return { error: "Invalid API Response" };
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log("[Gemini] Received text:", text);
    
    // Clean up potential markdown code blocks
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const details = JSON.parse(jsonStr);

    placeDetailsCache.set(cacheKey, details);
    return details;

  } catch (error) {
    console.error("[Gemini] Fetch Error:", error);
    return { error: `Exception: ${error.message}` };
  }
}

app.get('/places/:id', async (req, res) => {
  console.log(`GET /places/${req.params.id} hit`);
  try {
    const id = parseInt(req.params.id);
    
    // Direct lookup using the stable ID (index in master array)
    const city = cities[id];

    if (!city) {
      return res.status(404).json({ error: "Place not found" });
    }

    // Get curated data if available
    const curated = curatedPlacesMap.get(city.name.toLowerCase());
    
    // Helper for stable random ratings
    function getStableRating(name) {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return ((Math.abs(hash) % 21) / 10 + 3).toFixed(1);
    }

    // Fetch dynamic details from Gemini
    let geminiDetails = await fetchPlaceDetailsFromGemini(city.name, regionNames.of(city.country));

    const placeDetails = {
      id: id,
      name: city.name,
      country: city.country,
      countryName: regionNames.of(city.country),
      population: city.population,
      rating: curated ? curated.rating : getStableRating(city.name),
      image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400', // Frontend will fetch dynamic image
      description: geminiDetails?.description || (curated ? curated.description : `A beautiful city in ${regionNames.of(city.country)} with a population of ${city.population.toLocaleString()}. Discover the local culture, cuisine, and stunning views.`),
      currency: geminiDetails?.currency || (geminiDetails?.error ? `Error: ${geminiDetails.error}` : "Unknown"),
      language: geminiDetails?.language || (geminiDetails?.error ? `Error: ${geminiDetails.error}` : "Unknown")
    };

    res.json(placeDetails);

  } catch (error) {
    console.error("Error fetching place details:", error);
    res.status(500).json({ error: "Failed to fetch place details" });
  }
});

app.get('/countries', (req, res) => {
  res.json(countriesData);
});




 




app.post("/register", async (req, res) => {
  try {
    let name = req.body.username
    let email = req.body.email
    let password = req.body.password
    if (name == false || name.length < 3 || password.length < 8) {
      return res.json({ success: false, message: "Invalid data" });
      
    } else {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.json({ success: false, message: "User already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User();
      newUser.userName = name;
      newUser.email = email;
      newUser.password = hashedPassword;
      await newUser.save();
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
          expiresIn: "365d",
        });

        res.cookie("authToken", token, {
          httpOnly: true,
          maxAge: 365 * 24 * 60 * 60 * 1000,
          sameSite: 'Lax'
        });

      res.json({ success: true, userName: newUser.userName });

    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
})
  


app.post("/login", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "Email not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Wrong password" });
    }

  
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "365d",
    });

    res.cookie("authToken", token, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      sameSite: 'Lax'
    });

    res.json({ success: true, userName: user.userName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/check-login", async (req, res) => {
  const token = req.cookies.authToken;
  if (!token) return res.json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.json({ loggedIn: false });

    res.json({
      loggedIn: true,
      firstLetter: user.userName[0].toUpperCase(),
    });
  } catch (err) {
    return res.json({ loggedIn: false });
  }
});

app.post("/logout", (req, res) => {
  res.cookie("authToken", "", {
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'Lax'
  }).json({ success: true });
});
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ reply: "Error: Missing API Key in server configuration." });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "You are a helpful and knowledgeable travel guide assistant. You only answer questions related to travel, tourism, destinations, culture, and trip planning. If a user asks about anything else, politely decline and steer the conversation back to travel. You must reply in the same language the user speaks." }]
          },
          {
            role: "model",
            parts: [{ text: "Understood. I am ready to assist with any travel-related inquiries." }]
          },
          {
            role: "user",
            parts: [{ text: userMessage }]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Chat API Error:", errorText);
      return res.status(500).json({ reply: "Sorry, I am having trouble connecting to my brain right now." });
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error("Gemini Chat Unexpected response:", data);
        return res.status(500).json({ reply: "I received an empty response." });
    }

    const reply = data.candidates[0].content.parts[0].text;
    res.json({ reply: reply });

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ reply: "An internal error occurred." });
  }
});

// In-memory cache only (User requested to disable persistent file cache)
const imageCache = new Map();
let rateLimitResetTime = 0;

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400', // City sunset
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400', // Travel map
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400', // Road trip
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400', // Switzerland
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400', // Paris
  'https://images.unsplash.com/photo-1499856871940-a09627c6dcf6?w=400', // New York
  'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400', // New York 2
  'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=400', // Travel plane
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400', // Cinque Terre
  'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400'  // Venice
];

function getRandomFallback() {
  return FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
}

// Helper to fetch from Unsplash
async function fetchFromUnsplash(query) {
  if (!process.env.UNSPLASH_ACCESS_KEY) return null;
  try {
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
    if (response.status === 403) {
      console.log("Unsplash Rate Limit Hit");
      rateLimitResetTime = Date.now() + 60 * 60 * 1000; // Pause Unsplash for 1 hour
      return null;
    }
    if (!response.ok) return null;
    const data = await response.json();
    return data.results && data.results.length > 0 ? data.results[0].urls.regular : null;
  } catch (err) {
    console.error("Unsplash Fetch Error:", err);
    return null;
  }
}

// Helper to fetch from Pexels
async function fetchFromPexels(query) {
  if (!process.env.PEXELS_API_KEY) return null;
  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
      headers: { Authorization: process.env.PEXELS_API_KEY }
    });
    if (response.status === 429) {
      console.log("Pexels Rate Limit Hit");
      return null;
    }
    if (!response.ok) return null;
    const data = await response.json();
    return data.photos && data.photos.length > 0 ? data.photos[0].src.large : null;
  } catch (err) {
    console.error("Pexels Fetch Error:", err);
    return null;
  }
}

// Helper to fetch from Pixabay
async function fetchFromPixabay(query) {
  if (!process.env.PIXABAY_API_KEY) return null;
  try {
    const response = await fetch(`https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=3`);
    if (response.status === 429) {
      console.log("Pixabay Rate Limit Hit");
      return null;
    }
    if (!response.ok) return null;
    const data = await response.json();
    return data.hits && data.hits.length > 0 ? data.hits[0].largeImageURL : null;
  } catch (err) {
    console.error("Pixabay Fetch Error:", err);
    return null;
  }
}

// Unified Image Fetcher with Load Balancing (Unsplash + Pexels + Pixabay)
async function fetchImage(query) {
  // Check circuit breaker for Unsplash
  const unsplashAvailable = Date.now() > rateLimitResetTime;
  
  // Available providers
  let providers = ['pexels', 'pixabay'];
  if (unsplashAvailable) providers.push('unsplash');
  
  // Shuffle providers to load balance
  providers = providers.sort(() => Math.random() - 0.5);

  for (const provider of providers) {
    let imageUrl = null;
    if (provider === 'unsplash') {
      // console.log(`Trying Unsplash for: ${query}`);
      imageUrl = await fetchFromUnsplash(query);
    } else if (provider === 'pexels') {
      // console.log(`Trying Pexels for: ${query}`);
      imageUrl = await fetchFromPexels(query);
    } else if (provider === 'pixabay') {
      // console.log(`Trying Pixabay for: ${query}`);
      imageUrl = await fetchFromPixabay(query);
    }

    if (imageUrl) return imageUrl;
  }

  return null;
}

app.get("/country-image", async (req, res) => {
  try {
    const country = req.query.country;
    if (!country) return res.status(400).json({ error: "Country name is required" });

    const cacheKey = `country_${country.toLowerCase()}`;
    if (imageCache.has(cacheKey)) {
      return res.json({ imageUrl: imageCache.get(cacheKey) });
    }

    const imageUrl = await fetchImage(`${country} landscape nature`);
    
    if (imageUrl) {
      imageCache.set(cacheKey, imageUrl);
      return res.json({ imageUrl });
    }

    res.json({ imageUrl: getRandomFallback() });

  } catch (error) {
    console.error("Image Fetch Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/city-image", async (req, res) => {
  try {
    const city = req.query.city;
    const country = req.query.country;
    if (!city) return res.status(400).json({ error: "City name is required" });

    const cacheKey = `city_${city.toLowerCase()}_${(country || '').toLowerCase()}`;
    if (imageCache.has(cacheKey)) {
      return res.json({ imageUrl: imageCache.get(cacheKey) });
    }

    const query = `${city} ${country || ''} landmark travel`;
    const imageUrl = await fetchImage(query);

    if (imageUrl) {
      imageCache.set(cacheKey, imageUrl);
      return res.json({ imageUrl });
    }

    res.json({ imageUrl: getRandomFallback() });

  } catch (error) {
    console.error("Image Fetch Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/place-gallery', async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) return res.status(400).json({ error: "Query is required" });

    let allImages = [];

    // 1. Fetch from Pixabay (3 images)
    if (process.env.PIXABAY_API_KEY) {
        try {
            const response = await fetch(`https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=3`);
            if (response.ok) {
                const data = await response.json();
                if (data.hits) {
                    allImages.push(...data.hits.map(h => h.largeImageURL));
                }
            }
        } catch (e) { console.error("Pixabay Gallery Error", e); }
    }
    
    // 2. Fetch from Pexels (3 images)
    if (process.env.PEXELS_API_KEY) {
        try {
            const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`, {
                headers: { Authorization: process.env.PEXELS_API_KEY }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.photos) {
                    allImages.push(...data.photos.map(p => p.src.large));
                }
            }
        } catch (e) { console.error("Pexels Gallery Error", e); }
    }

    // 3. Fetch from Unsplash (3 images)
    if (process.env.UNSPLASH_ACCESS_KEY) {
        try {
            // Check rate limit first
            if (Date.now() > rateLimitResetTime) {
                const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=3&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
                if (response.status === 403) {
                    rateLimitResetTime = Date.now() + 60 * 60 * 1000;
                } else if (response.ok) {
                    const data = await response.json();
                    if (data.results) {
                        allImages.push(...data.results.map(r => r.urls.regular));
                    }
                }
            }
        } catch (e) { console.error("Unsplash Gallery Error", e); }
    }

    // Shuffle the combined images
    allImages = allImages.sort(() => Math.random() - 0.5);

    // If we have images, return them
    if (allImages.length > 0) {
        return res.json({ images: allImages });
    }

    // Fallback to random placeholders if absolutely nothing found
    res.json({ images: FALLBACK_IMAGES.slice(0, 8) });

  } catch (error) {
    console.error("Gallery Fetch Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Comment System ---
const Comment = require('./models/comment');

app.get('/comments/:placeId', async (req, res) => {
    try {
        const comments = await Comment.find({ placeId: req.params.placeId }).sort({ date: -1 });
        res.json(comments);
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ error: "Failed to fetch comments" });
    }
});

app.post('/comments', async (req, res) => {
    console.log("POST /comments hit. Body:", req.body);
    try {
        const { placeId, userName, text } = req.body;
        if (!placeId || !userName || !text) {
            console.log("Missing fields:", { placeId, userName, text });
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newComment = new Comment({
            placeId,
            userName,
            text
        });

        await newComment.save();
        console.log("Comment saved successfully");
        res.json({ success: true, comment: newComment });
    } catch (error) {
        console.error("Error saving comment:", error);
        res.status(500).json({ error: `Failed to save comment: ${error.message}` });
    }
});

app.get('/check-gemini', async (req, res) => {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Loaded ${cities.length} cities`);
});


