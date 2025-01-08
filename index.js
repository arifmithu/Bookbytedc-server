const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5000",
      "http://localhost:5174",
      "http://localhost:5173",
      "https://bookbyte-dc.web.app",
      "https://bookbyte-dc.firebaseapp.com",
      "https://bookbytedc.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cjxdffi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const logger = (req, res, next) => {
  console.log("logger", req.method, req.url);
  next();
};
const verifyToken = (req, res, next) => {
  console.log(JSON.stringify(req.cookies));
  const token = req?.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  console.log("token received");
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: "unauthorized access" });
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const allBooks = client.db("BookDB").collection("Books");
    const borrowedBooks = client.db("BookDB").collection("BorrowedBooks");

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    app.post("/user/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    app.post("/user/jwt/token/logout", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // get all books
    app.get("/books", async (req, res) => {
      const cursor = allBooks.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // get a book by search
    app.get("/books/:title", async (req, res) => {
      const bookName = req.params.title;
      console.log(bookName, "bookname");
      const query = { bookName: bookName };
      const result = await allBooks.findOne(query);
      if (result == null) {
        return res.send({ status: 404 });
      }
      res.send(result);
    });

    // add a book
    app.post("/books", async (req, res) => {
      const book = req.body;
      // console.log(book);
      const result = await allBooks.insertOne(book);
      res.send(result);
    });

    app.get("/books/category/:category", async (req, res) => {
      const categ = req.params.category;
      console.log(categ);
      const query = { category: { $in: [categ] } };
      const cursor = await allBooks.find(query).toArray();
      res.send(cursor);
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
        const id = req.query.id;
        console.log("getting", id);
        const result = await borrowedBooks.insertOne(book);
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
    app.get(
      "/books/borrowed/allbooks",
      logger,
      verifyToken,
      async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        if (req.user.email != email) {
          return res.status(403).send({ message: "forbidden access" });
        }
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
      }
    );

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
