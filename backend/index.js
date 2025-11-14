const express = require("express");
const app = express();
const db = require('./db')
const User = require('./models/user')
const cors = require("cors");
app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json())



app.listen(3000, () => {
  console.log("Server is listening on port 3000");
}); 




app.post("/register", async (req, res) => {
  let name = req.body.username
  let email = req.body.email
  let password = req.body.password
  if (name == false || name.length < 3 || password.length < 8) {
    return res.json({ success: false, message: "Invalid data" });
    
  } else {
    const newUser = new User();
    newUser.userName = name;
    newUser.email = email;
    newUser.password = password;
    await newUser.save();

    res.json({ success: true })

  }

})
  


app.post("/login", (req, res) => {
  
})



