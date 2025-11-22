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
          expiresIn: "7d",
        });

        res.cookie("authToken", token, {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000,
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

    // إنشاء توكن JWT عند تسجيل الدخول
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("authToken", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
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








