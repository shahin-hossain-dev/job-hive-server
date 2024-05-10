const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Jobhive Server is Running");
});

app.listen(port, () => {
  console.log(`Server is Running Port on ${port}`);
});
