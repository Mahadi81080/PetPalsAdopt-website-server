const express = require("express");
const cors = require("cors");
const app = express();
var jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;
// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://blog-website-e15da.web.app",
      "https://blog-website-e15da.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ityl5rk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// middleware
const cookeOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("PetPalsDB").collection("users");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log("user of token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, cookeOption).send({ success: true });
    });
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logout", user);
      res
        .clearCookie("token", { ...cookeOption, maxAge: 0 })
        .send({ success: true });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert email is user doesnt exist:
      // you can do this many ways :(1.email unique, 2. upsert, 3. simple checking)
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exsits", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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
  res.send("PetPalsAdopt server running");
});

app.listen(port, () => {
  console.log(`PetPalsAdop server listening on port ${port}`);
});
