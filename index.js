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

    // database collections
    const jobCollection = client.db("jobHiveDB").collection("jobs");
    const appliedJobsCollection = client
      .db("jobHiveDB")
      .collection("appliedJobs");
    const blogsCollection = client.db("jobHiveDB").collection("blogs");

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

    // get my jobs by email query
    app.get("/my-jobs", verifyToken, async (req, res) => {
      const queryEmail = req.query.email;
      const query = { user_email: queryEmail };
      const verifyEmail = req.user.email;

      if (queryEmail !== verifyEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });

    // get all blogs

    app.get("/blogs", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    });

    // post job
    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const jobDoc = {
        job_banner_url: newJob.imageURL,
        job_title: newJob.jobTitle,
        user_name: newJob.userName,
        user_email: newJob.userEmail,
        job_category: newJob.jobCategory,
        min_range: newJob.minRange,
        max_range: newJob.maxRange,
        job_description: newJob.jobDescription,
        job_posting_date: newJob.jobPostingDate,
        application_deadline: newJob.applicationDeadline,
        job_applicants: newJob.jobApplicants,
      };
      const result = await jobCollection.insertOne(jobDoc);
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

    // update job

    app.put("/job/:id", async (req, res) => {
      const id = req.params.id;
      const updatedJob = req.body;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          job_banner_url: updatedJob.imageURL,
          job_title: updatedJob.jobTitle,
          user_name: updatedJob.userName,
          user_email: updatedJob.userEmail,
          job_category: updatedJob.jobCategory,
          min_range: updatedJob.minRange,
          max_range: updatedJob.maxRange,
          job_description: updatedJob.jobDescription,
          application_deadline: updatedJob.applicationDeadline,
        },
      };
      const result = await jobCollection.updateOne(filter, updatedDoc, option);

      res.send(result);
    });

    //update applicants numbers
    app.patch("/job/:id", async (req, res) => {
      const id = req.params.id;
      // const updateApplicants = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: {
          job_applicants: 1,
        },
      };
      const result = await jobCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // delete jobs
    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
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
