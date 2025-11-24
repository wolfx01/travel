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
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(cookieParser());


app.use(express.urlencoded({ extended: true }));
app.use(express.json())

const countriesData = require('../frontend/data/countries.json');

app.get('/countries', (req, res) => {
  res.json(countriesData);
});




app.listen(3000, () => {
  console.log("Server is listening on port 3000");
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
      maxAge: 365 * 24 * 60 * 60 * 1000, 
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

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ reply: "Error: Missing API Key in server configuration." });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful and knowledgeable travel guide assistant. You only answer questions related to travel, tourism, destinations, culture, and trip planning. If a user asks about anything else, politely decline and steer the conversation back to travel. You must reply in the same language the user speaks." },
          { role: "user", content: userMessage }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenRouter API Error:", errorData);
      return res.status(500).json({ reply: "Sorry, I am having trouble connecting to my brain right now." });
    }

    const data = await response.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ reply: "An internal error occurred." });
  }
});

app.get("/country-image", async (req, res) => {
  try {
    const country = req.query.country;
    if (!country) {
      return res.status(400).json({ error: "Country name is required" });
    }

    if (!process.env.UNSPLASH_ACCESS_KEY) {
      console.error("Unsplash API Key missing");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(country)}%20landscape%20nature&orientation=landscape&per_page=1&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Unsplash API Error:", errorData);
      return res.status(500).json({ error: "Failed to fetch image" });
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      res.json({ imageUrl: data.results[0].urls.regular });
    } else {
      // Fallback if no image found
      res.json({ imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400' });
    }
  } catch (error) {
    console.error("Image Fetch Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});










