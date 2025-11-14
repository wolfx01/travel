const mongoose = require('mongoose')
mongoose.connect(
  "mongodb+srv://bilal-User:0673840579@cluster0.pfny4xk.mongodb.net/?appName=Cluster0"
)
    .then(() => {
    console.log("Connected to  db  ")
    })
    .catch(()=> {
     console.log("unable to Connected to  db  ")
})