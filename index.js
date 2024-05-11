const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cjxdffi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const allBooks = client.db("BookDB").collection("Books");

    // get all books
    app.get("/books", async (req, res) => {
      const cursor = allBooks.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // add a book
    app.post("/books", async (req, res) => {
      const book = req.body;
      console.log(book);
      const result = await allBooks.insertOne(book);
      res.send(result);
    });

    app.get("/books/:category", async (req, res) => {
      const categ = req.params.category;
      const query = { category: categ };
      const cursor = allBooks.find(query);
      const result = await cursor.toArray();
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
run().catch(console.log);

app.get("/", (req, res) => {
  res.send("BookByte DC server is running");
});

app.listen(port, () => {
  console.log(`Bookbyte DC server listening on port ${port}`);
});
