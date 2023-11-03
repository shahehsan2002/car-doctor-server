const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require ('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: ['http://localhost:5173',], 
  credentials: true, 
}));
app.use(express.json());
app.use(cookieParser());

console.log(process.env.DB_PASS);



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a0la5er.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares

const logger = async (req,res,next) => {
  console.log('called:',req.host,req.originalUrl)
  next();
}

const verifyToken = async (req,res,next) =>{
  const token =req.cookies?.token;
  console.log('value of token in middleware', token);
  if(!token){
    return res.status(401).send({message:'not authorized'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) =>{
    //error
    if(err){
      console.log(err);
      return res.status(401).send({message:'unauthorized'})
    }
    // if token is valid then it would be decoded 
    console.log('Value in the token', decoded);
    req.user=decoded;
    next();
  })
}
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carsDoctor').collection('services');
    const orderCollection = client.db('carsDoctor').collection('orders')

    // auth related api

    app.post('/jwt',logger, async (req,res) => {
      const user = req.body;
      console.log(user);
      const token =jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'});
      res
      .cookie('token',token, {
        httpOnly:true,
        secure:false,
        
      })
      .send({success:true});
    })



    // services related api

    app.get('/services',logger, async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }

      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };

      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    })

    // orders

    app.get('/orders',logger,verifyToken, async (req, res) => {
      console.log(req.query.email);
      // console.log('toooooooken',req.cookies.token)
      console.log('user in the valid token',req.user);
      if(req.query.email !== req.user.email){
        return res.status(403).send({message:'forbidden access'})
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/orders', async (req, res) => {
      const order = req.body;
      console.log(order);
      const result = orderCollection.insertOne(order);
      res.send(result);
    });

    // app.patch('/orders/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new objectId(id) };
    //   const updatedOrder = req.body;
    //   console.log(updatedOrder);
    //   const updateDoc = {
    //     $set: {
    //       status: updatedOrder.status
    //     },
    //   };
    //   const result = await orderCollection.updateOne(filter, updateDoc);
    //   res.send(result);
    // })


    // app.patch('/orders/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const updatedOrder = req.body;
    //   console.log(updatedOrder);
    //   const updateDoc = {
    //     $set: {
    //       status: updatedOrder.status
    //     },
    //   };
    //   const result = await orderCollection.updateOne(filter, updateDoc);
    //   res.send(result);
    // });

    app.patch('/orders/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedOrder = req.body;
        console.log(updatedOrder);
        const updateDoc = {
          $set: {
            status: updatedOrder.status
          },
        };
        const result = await orderCollection.updateOne(filter, updateDoc);
    
        if (result.modifiedCount > 0) {
          res.status(200).json({ success: true, message: 'Order status updated successfully.' });
        } else {
          res.status(404).json({ success: false, message: 'Order not found.' });
        }
      } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
      }
    });
    
    



    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('doctor is running')
})

app.listen(port, () => {
  console.log(`Car Doctor Server is running on port ${port}`);
})