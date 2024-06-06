const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SCREET_KEY);
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
const logger = async (req, res, next) => {
  console.log("called".req.host, req.originalUrl);
  next();
};
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("Value of token in middleware", token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized token" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

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
    const petItemCollection = client.db("PetPalsDB").collection("petItems");
    const donationCollection = client.db("PetPalsDB").collection("donation");
    const paymentCollection = client.db("PetPalsDB").collection("payments");
    const adoptRequestCollection = client
      .db("PetPalsDB")
      .collection("adoptRequest");

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
      // console.log("logout", user);
      res
        .clearCookie("token", { ...cookeOption, maxAge: 0 })
        .send({ success: true });
    });
    // User related api

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

    // Pet item related api
    app.get("/petItem", async (req, res) => {
      const result = await petItemCollection.find().toArray();
      res.send(result);
    });
    app.get("/petItem/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petItemCollection.findOne(query);
      res.send(result);
    });
    app.post("/petItem", async (req, res) => {
      const item = req.body;
      const result = await petItemCollection.insertOne(item);
      res.send(result);
    });
    app.patch("/petItem/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: item.name,
          category: item.category,
          age: item.age,
          location: item.location,
          shortDescription: item.shortDescription,
          longDescription: item.longDescription,
          image: item.image,
          date: item.date,
        },
      };
      const result = await petItemCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.delete("/petItem/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    // pet adopted related api
    app.patch("/petAdopt/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          adopted: "true",
        },
      };
      const result = await petItemCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // Adopt request related api
    app.post("/adoptRequest", async (req, res) => {
      const request = req.body;
      const result = await adoptRequestCollection.insertOne(request);
      res.send(result);
    });
    // Donation related api
    app.get("/donation", async (req, res) => {
      const result = await donationCollection.find().toArray();
      res.send(result);
    });
    app.get("/donation/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationCollection.findOne(query);
      res.send(result);
    });
    app.post("/donation", async (req, res) => {
      const item = req.body;
      const result = await donationCollection.insertOne(item);
      res.send(result);
    });
    // Payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { donation } = req.body;
      const amount = parseInt(donation * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
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
