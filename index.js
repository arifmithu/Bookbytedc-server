const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const borrowedBooks = client.db("BookDB").collection("BorrowedBooks");

    // get all books
    app.get("/books", async (req, res) => {
      const cursor = allBooks.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // add a book
    app.post("/books", async (req, res) => {
      const book = req.body;
      // console.log(book);
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

    app.get("/:id", async (req, res) => {
      const bookId = req.params.id;
      // console.log(bookId);
      const query = { _id: new ObjectId(bookId) };
      const cursor = await allBooks.findOne(query);
      // const result = await cursor.toArray();
      res.send(cursor);
    });
    app.post("/books/borrowed/allbooks", async (req, res) => {
      try {
        const book = req.body;
        console.log("hello", book);
        const id = req.query.id;
        console.log("getting", id);
        const result = await borrowedBooks.insertOne(book);
        console.log(result);
        if (id) {
          await allBooks.updateOne(
            { _id: new ObjectId(id) },
            { $inc: { quantity: -1 } }
          );
        }

        res.send(result);
      } catch (error) {
        res.status(500).send(error);
      }
    });
    app.get("/books/borrowed/allbooks", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = borrowedBooks.find(query);
      const result = await cursor.toArray();
      console.log("result", result);
      const bookIds = result.map((book) => new ObjectId(book.bookId));
      const bookDetailsQuery = { _id: { $in: bookIds } };
      const bookDetailsCursor = allBooks.find(bookDetailsQuery);
      const bookDetails = await bookDetailsCursor.toArray();
      const allBorrowedBooks = bookDetails.map((book) => {
        const borrowedbook = result.find((e) => e.bookId == book._id);
        return {
          ...book,
          borrowingDate: borrowedbook.borrowingDate,
          returningDate: borrowedbook.returningDate,
        };
      });
      // console.log("result", bookDetails);
      res.send(allBorrowedBooks);
    });

    app.delete("/deleteBorrowedBook", async (req, res) => {
      const id = req.query.id;
      const query = { bookId: id };
      console.log("inside wrong");
      const result = await borrowedBooks.deleteOne(query);
      const update = allBooks.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { quantity: 1 } }
      );
      res.send(result);
    });

    app.put("/books", async (req, res) => {
      const id = req.query.id;
      const book = req.body;
      console.log("hello", book);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updatedBook = {
        $set: {
          bookName: book.bookName,
          authorName: book.authorName,
          category: book.category,
          quantity: book.quantity,
          image: book.image,
          description: book.description,
          rating: book.rating,
          tags: book.tags,
        },
      };
      const result = await allBooks.updateOne(filter, updatedBook, options);
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
