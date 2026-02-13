const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000;

const admin = require("firebase-admin");

const serviceAccount = require("./loan-link-rk-firebase-adminsdk-key.json");

// const serviceAccount = require("./firebase-admin-key.json");



// const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
// const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});






app.use(cors())
app.use(express.json())


// const uri = "mongodb+srv://rikomia722_db_user:92LZPanIs2ZBZf7p@loan-link.fuipv60.mongodb.net/?appName=loan-link";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@loan-link.fuipv60.mongodb.net/?appName=loan-link`;
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@loan-link.fuipv60.mongodb.net/?appName=loan-link-A11`;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyFireBaseToken= async(req, res, next) =>{
  const authorization =req.headers.authorization;
  if(!authorization){
    return res.status(401).send({message:'unauthorized access'})

  }
  const token = authorization.split(' ')[1]
  if(!token){
    return res.status(401).send({message:'unauthorized access'})
  }
  
  //  verify token
  try{
    const decoded = await admin.auth().verifyIdToken(token)
    console.log('after decode token ', decoded)
    req.token_email = decoded.email;
    next()
  }
  catch{
    return res.status(401).send({message:'unauthorized access'})

  }
}





// app.get('/', (req, res) => {
//   res.send('Hello World!')
// })





async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const db = client.db("loan-link")
    const usersCollection = db.collection("users");
    const addLoansCollection = db.collection("add-loans")
    const loanCollection= db.collection("loan-application")


    // admin verify 
const verifyAdmin = async (req, res, next) =>{
  const email = req.decoded_email;
  const query = {email};
  const user = await usersCollection.findOne(query)

  if(!user || user.role !== 'admin'){
    return res.status(403).send({message:"Forbidden access"})
  }

  next()
}



    // Manager verify 
const verifyManager = async (req, res, next) =>{
  const email = req.decoded_email;
  const query = {email};
  const user = await usersCollection.findOne(query)

  if(!user || user.role !== 'manager'){
    return res.status(403).send({message:"Forbidden access"})
  }

  next()
}


    app.post("/users", async(req, res) =>{
        const newUser = req.body;
        const email = req.body.email
        const query = {email : email}
        const existingUser = await usersCollection.findOne(query)
        if(existingUser) {
          res.send('User already exits. do not need to add again.')
        } else{
          const result = await usersCollection.insertOne(newUser)
          console.log(result)
          res.send(result)
        }
    })


    app.post("/addLoans", async(req, res) =>{
        const addLoan = req.body;
        const addNewLoan={...addLoan, createdAt: new Date(),}
        const result = await addLoansCollection.insertOne(addNewLoan)
        res.send(result)
    })

    app.post("/loanApply", async(req, res) =>{
        const loanApply = req.body;
        const newLoanApply = {...loanApply, createdAt: new Date()}
        const result = await loanCollection.insertOne(newLoanApply)
        res.send(result)
    })




    app.get("/max-loans-six", async (req, res) =>{

      const cursor = addLoansCollection.find({showOnHome: true}).sort({createdAt: -1}).limit(6)
      // const cursor = addLoansCollection.find().limit(6)
      const result = await cursor.toArray()
      res.send(result)
    })


    app.get("/all-loans", async (req, res) =>{
      const cursor = addLoansCollection.find({showOnHome: true}).sort({createdAt: -1})
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get("/details/:id", async (req, res) =>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await addLoansCollection.findOne(query)
      res.send(result)
    })

// Find all users admin Routes
    app.get("/users", async (req, res) =>{
          const cursor = usersCollection.find().sort({createdAt: -1})
          const result = await cursor.toArray()
          res.send(result)
        })

        
    app.get("/users/:email/role", async (req, res) =>{
          const email = req.params.email;
          const query = {email}
          const user = await usersCollection.findOne(query)
          // console.log(user, {role: user?.role || 'borrower'})
          res.send({role: user?.role || 'borrower'})
    })

// Admin all loans Api
    app.get("/all-loans-admin",  async (req, res) =>{
          const cursor = addLoansCollection.find().sort({createdAt: -1})
          const result = await cursor.toArray()
          res.send(result)
        })


        // Control Show on home Toggle Event 
            app.patch('/toggle-home/:id', async (req, res) => {
              const id = req.params.id;
              
              const updateShowOnHome= req.body;
              const query = {_id: new ObjectId(id)}
              const update = {
                $set:{
                  showOnHome : updateShowOnHome.showOnHome
                }
              }
              const result = await addLoansCollection.updateOne(query, update)
              // console.log(result)
                res.send(result)
            });


 // Control Reject Event 
            app.patch('/loan-reject/:id', async (req, res) => {
              const id = req.params.id;
              
              const updateStatus= req.body;
              const query = {_id: new ObjectId(id)}
              const update = {
                $set:{
                  status : updateStatus.status
                }
              }
              const result = await loanCollection.updateOne(query, update)
              console.log(result)
                res.send(result)
            });

// Admin all loans application Api
    app.get("/all-loans-application-admin",  async (req, res) =>{
          const cursor = loanCollection.find().sort({createdAt: -1})
          const result = await cursor.toArray()
          res.send(result)
        })

    // Delete loan on admin
    app.delete('/loan-delete/:id', async (req, res) => {
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await addLoansCollection.deleteOne(query)
      res.send(result)
    })


// find created by the my all add-loan
        app.get("/all-loan/:email", async (req, res) =>{
          const email = req.params.email;
          const query = {createdEmail:email}
          const cursor = addLoansCollection.find(query).sort({createdAt: -1})
          const result = await cursor.toArray()
          res.send(result)
    })

    
    // Find all pending application 
    app.get("/pending-loans", async (req, res) =>{
      const cursor = loanCollection.find({status: "Pending"})
      const result = await cursor.toArray()
      res.send(result)
    })

    // Find all Approved application 
    app.get("/approved-loans", async (req, res) =>{
      const cursor = loanCollection.find({status: "Approved"})
      const result = await cursor.toArray()
      res.send(result)
    })


    //Borrower find created by the my all my-loans
        app.get("/my-loan/:email", async (req, res) =>{
          const email = req.params.email;
          const query = {email:email}
          const cursor = loanCollection.find(query).sort({createdAt: -1})
          const result = await cursor.toArray()
          res.send(result)
    })



    // Delete loan on Created by the Manager
//     app.delete('/loan-delete/:id', async (req, res) => {
//       const id = req.params.id
//       const query = {_id: new ObjectId(id)}
// console.log(id)
//       const result = await addLoansCollection.deleteOne(query)
//       res.send(result)
//     })



    // Send a ping to confirm a successful connection


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
