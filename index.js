require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');


const app = express();
//middleware
app.use(express.json());
app.use(cors());


//route middleware
app.use('/apartment', require('./routes/apartmentRoute'));
app.use('/user', require('./routes/userRoute'));
app.use('/bookings', require('./routes/bookingRoute'));
app.use('/message', require('./routes/emailRoute'));



//connect to database
mongoose.connect(process.env.mongoose_uri)
.then(()=>{
    app.listen(process.env.port, ()=>{
        console.log(`server live at port ${process.env.port}`)
    })
}).catch(error=>{
    console.error(error)
})