const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://job-hive-84d2f.web.app",
      "https://job-hive-84d2f.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.TOKEN_SECRET_KEY, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const user = process.env.DB_USER;
const pass = process.env.DB_PASS;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${user}:${pass}@cluster0.kdwhpbt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const jobCollection = client.db("jobHiveDB").collection("jobs");
    const appliedJobsCollection = client
      .db("jobHiveDB")
      .collection("appliedJobs");

    // jwt token
    app.post("/jwt", (req, res) => {
      const email = req.body;

      const token = jwt.sign(email, process.env.TOKEN_SECRET_KEY, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // get all jobs
    app.get("/jobs", async (req, res) => {
      const cursor = await jobCollection.find().toArray();
      res.send(cursor);
    });
    // get job with specific id
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });
    // get jobs by job type query
    app.get("/job", async (req, res) => {
      const query = req.query.type;
      const result = await jobCollection
        .find({ job_category: query })
        .toArray();
      res.send(result);
    });

    // get all applied jobs

    app.get("/applied-jobs", verifyToken, async (req, res) => {
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const verifyEmail = req.user.email;
      if (userEmail !== verifyEmail) {
        return res.status(403).send({ message: "forbidden Access" });
      }

      const cursor = await appliedJobsCollection.find(query).toArray();
      res.send(cursor);
    });

    app.post("/applied", async (req, res) => {
      const appliedJob = req.body;
      const result = await appliedJobsCollection.insertOne(appliedJob);
      res.send(result);
    });

    app.patch("/job/:id", async (req, res) => {
      const id = req.params.id;
      const updateApplicants = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          job_applicants: updateApplicants.newCount,
        },
      };
      const result = await jobCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Jobhive Server is Running");
});

app.listen(port, () => {
  console.log(`Server is Running Port on ${port}`);
});
