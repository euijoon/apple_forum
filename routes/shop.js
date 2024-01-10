const router = require('express').Router()

let connectDB = require('./../database.js')

let db
connectDB.then((client)=>{
  db = client.db('forum');
}).catch((err)=>{
  console.log(err)
});

router.get('/shirts', (요청, 응답) => {
    응답.send('셔츠');
})

module.exports = router