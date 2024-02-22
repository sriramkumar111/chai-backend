//require('dotenv').config({path: './env})

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import {app} from "./app.js";


dotenv.config({
    path: './env'
})



connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () =>{
        console.log(`  Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGO db commection failed !!! ",err);
})











/*  //it is the 1st way to connect to db
import express from "express";
const app = express ()

( async () => {

    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/$ {DB_NAME}`)
        app.on("error",(error)=> {
            console.log("ERRR: ",error);
            throw error 
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App listening on port ${process.env.PORT}`);
        })
    }catch(error){
        console.error("ERROR: ", error)
        throw err
    }

})() */