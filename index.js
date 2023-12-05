const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 7070;

const secret = process.env.ACCESS_TOKEN_SECRET;

// middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://the-career-maker.netlify.app"],
    credentials: true,
  })
);
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gbcelyw.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();

    

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

const servicesCollection = client
      .db("careerMakerDB")
      .collection("services");

    const bookingsCollection = client
      .db("careerMakerDB")
      .collection("bookings");

    // middlewares
    // verify token and grant access
    const getMan = (req, res, next) => {
      const { token } = req.cookies;
      console.log(req.cookies.token);

      if (!token) {
        return res.status(401).send({ message: "You are not authorized" });
      }

      jwt.verify(token, secret, function (err, decoded) {
        console.log(err);
        if (err) {
          return res.status(401).send({ message: "You are not authorized" });
        }
        req.user = decoded;
        next();
      });
    };

    // get all services data
    app.get("/api/v1/services", async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get user specific service
    app.get("/api/v1/owner/services", getMan, async (req, res) => {
      const queryEmail = req.query.email;
      const tokenEmail = req.user.email;
      console.log(req.query, req.user);

      if (queryEmail !== tokenEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await servicesCollection
        .find({ ownerEmail: queryEmail })
        .toArray();
      res.send(result);
    });

    // get a service data
    app.get("/api/v1/service/:serviceId", async (req, res) => {
      const id = req.params.serviceId;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const server = await servicesCollection.findOne(query);
      console.log(server);
      res.send(server);
    });

    // create a service
    app.post("/api/v1/services/create-service", async (req, res) => {
      const service = req.body;
      const result = await servicesCollection.insertOne(service);
      console.log(result);
      res.send(result);
    });

    // update service details
    app.put("/api/v1/services/update-service/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateService = req.body;
      const service = {
        $set: {
          serviceName: updateService.serviceName,
          serviceImage: updateService.serviceImage,
          ownerName: updateService.ownerName,
          ownerEmail: updateService.ownerEmail,
          ownerImage: updateService.ownerImage,
          price: updateService.price,
          serviceArea: updateService.serviceArea,
          description: updateService.description,
        },
      };
      const result = await servicesCollection.updateOne(
        filter,
        service,
        options
      );
      res.send(result);
    });

    // delete a service
    app.delete(
      "/api/v1/service/remove-service/:serviceId",
      async (req, res) => {
        const id = req.params.serviceId;
        const query = { _id: new ObjectId(id) };
        const result = await servicesCollection.deleteOne(query);
        console.log(result);
        res.send(result);
      }
    );

    // get user specific bookings
    app.get("/api/v1/user/bookings", getMan, async (req, res) => {
      const queryEmail = req.query.email;
      const tokenEmail = req.user.email;
      console.log(req.query, req.user);

      if (queryEmail !== tokenEmail) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const result = await bookingsCollection
        .find({
          customerEmail: queryEmail,
        })
        .toArray();
      res.send(result);
    });

    // user added a booking
    app.post("/api/v1/user/create-booking", async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      console.log(result);
      res.send(result);
    });

    // user delete a booking
    app.delete(
      "/api/v1/user/cancel-booking/:bookingId",
      getMan,
      async (req, res) => {
        const id = req.params.bookingId;
        const query = { _id: new ObjectId(id) };
        const result = await bookingsCollection.deleteOne(query);
        res.send(result);
      }
    );

    // authentication routes
    app.post("/api/v1/auth/access-token", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, secret, { expiresIn: 60 * 60 });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          // sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/api/v1/auth/logOut", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

app.get("/", (req, res) => {
  res.send("Welcome to Career Maker Server");
});

app.listen(port, () => {
  console.log(`Career Maker Server is running at http://localhost:${port}`);
});
