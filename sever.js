const express = require('express');
const app = express();

app.use(express.static(__dirname + '/public')); //css 파일 리드 세팅
app.set('view engine', 'ejs') //ejs 세팅
app.use(express.json()); // post 요청 해석 세팅 (res.body 사용에 필요)
app.use(express.urlencoded({extended:true})); // post 요청 해석 세팅 (res.body 사용에 필요)

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');
require('dotenv').config();

app.use(passport.initialize())
app.use(session({
  secret: '01234',
  resave : false,
  saveUninitialized : false,
  cookie : {
    maxAge: 60 * 60 * 1000
  },
  store : MongoStore.create({
    mongoUrl : process.env.DB_URL,
    dbName : 'forum'
  })
}))

app.use(passport.session()) 

// function now_time(req, res, next){
//   console.log(new Date());
//   next()
// }

// app.use('/list', now_time)



const methodOverrid = require('method-override');
app.use(methodOverrid('_method'));


//몽고DB 연결
const { MongoClient, ObjectId } = require('mongodb')

let connectDB = require('./database.js')

let db
connectDB.then((client)=>{
  console.log('DB연결성공');
  db = client.db('forum');
  app.listen(process.env.PORT, () => {
    console.log('http://localhost:8080 에서 서버 실행중')
});
}).catch((err)=>{
  console.log(err)
});



app.get('/', (요청, 응답) => {
    응답.redirect('/list');
});

app.get('/about', (요청, 응답) => {
    응답.sendFile(__dirname + '/about.html');
});

app.get('/list', async (요청, 응답) => {
    let result = await db.collection('post').find().toArray();  //몽고DB 리스트 가져오기

    응답.render('list.ejs', { posts : result }); // 리스트 보내기
});

app.get('/time', (요청, 응답) => {
  const time = new Date();
  응답.render('time.ejs', { time });
});

app.get('/write', (요청, 응답) => {
  응답.render('write.ejs');
});

app.post('/add', async (요청, 응답) =>{

  try{    //try catch 에러 확인
    if (요청.body.title == '' || 요청.body.content == ''){
      응답.send('비어있는 칸이 있습니다.')
    }else{
      await db.collection('post').insertOne({ title : 요청.body.title, content : 요청.body.content, views: 0, like: 0}); //db 저장
      응답.redirect('/list');
    }
  } catch(e){
    console.log(e);
    응답.status(500).send('서버에러');
  }
});

app.get('/detail/:id', async (요청, 응답) => {
  try{
    let url = 요청.params;
    let result = await db.collection('post').findOne({ _id: new ObjectId(url.id) });
    if(result == null ){
      응답.status(400).send("요청하신 글이 없습니다.")
    }
    응답.render('detail.ejs', { result });
  }catch(e){
    console.log(e);
    응답.status(400).send("요청하신 글이 없습니다.")
  }
});

app.get('/modify/:id', async (요청,응답) => {
  try{
    let url = 요청.params;
    let result = await db.collection('post').findOne({ _id: new ObjectId(url.id) });
    if(result == null ){
      응답.status(400).send("요청하신 글이 없습니다.")
    }
    응답.render('modify.ejs', { result });
  }catch(e){
    console.log(e);
    응답.status(400).send("요청하신 글이 없습니다.")
  }
});

app.put('/modify', async (요청,응답) => {
  try{
    let result = await db.collection('post').updateOne({ _id: new ObjectId(요청.body.id)}, { $set:{title: 요청.body.title, content: 요청.body.content}});
    console.log(result);
    응답.redirect('/list');
  }catch(e){
    응답.send("다시 시도해 주시기 바랍니다.")
  }
  
})

app.delete('/delete', async (요청, 응답) => {
  let result = await db.collection('post').deleteOne( { _id : new ObjectId(요청.query.docid) } );
  console.log("삭제완료");
  응답.send("삭제완료");
  
})


app.get('/list/:page', async (요청, 응답) => {
  let pageNum = 5
  let page = 요청.params.page * pageNum - pageNum
  console.log(page)
  let result = await db.collection('post').find().skip(page).limit(pageNum).toArray();  //몽고DB 리스트 가져오기, skip(5).limit(5) 위에서 부터 5개글 건너띄고 다음 5개글 가져오기

  응답.render('list.ejs', { posts : result }); // 리스트 보내기
});

app.get('/list/next/:pageid', async (요청, 응답) => {
  let pageNum = 5
  let page = 요청.params.page * pageNum - pageNum
  console.log(page)
  let result = await db.collection('post').find({ _id : {$gt : new ObjectId (요청.params.pageid)}}).limit(pageNum).toArray();  //몽고DB 리스트 가져오기, skip(5).limit(5) 위에서 부터 5개글 건너띄고 다음 5개글 가져오기

  응답.render('list.ejs', { posts : result }); // 리스트 보내기
});


passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
  let result = await db.collection('user').findOne({ username : 입력한아이디})
  if (!result) {
    return cb(null, false, { message: '아이디 DB에 없음' })
  }
  
  if (await bcrypt.compare(입력한비번, result.password)) {
    return cb(null, result)
  } else {
    return cb(null, false, { message: '비번불일치' });
  }
}))

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username })
  })
})

passport.deserializeUser(async (user, done) => {
  let result = await db.collection('user').findOne({ _id: new ObjectId(user.id) })
  delete result.password;
  process.nextTick(() => {
    return done(null, result)
  })
})

app.get("/login", async (요청, 응답) => {
  console.log(요청.user);
  응답.render("login.ejs");
})

app.post("/login", async (요청, 응답, next) => {
  passport.authenticate('local', (error, user, info) => {
    if(error) return 응답.status(500).json(error);
    if(!user) return 응답.status(401).json(info.message);
    요청.login(user, (err) => {
      if (err) return next(err)
      응답.redirect("/");
    })
  })(요청, 응답, next)
})

app.get("/mypage", (요청, 응답) => {
  if(요청.user == null){
    응답.send("로그인을 먼저해 주세요.")
    
  }
  else{
    let user_name = 요청.user.username;
    응답.render("mypage.ejs", { user_name});
  }
})

app.get("/register", (요청, 응답) => {
  응답.render("register.ejs");
})

function login_error(요청, 응답, next){
  if(요청.body.username =='' || 요청.body.password == ''){
    응답.send("비어있는칸이 있습니다");
  } else {
    next();
  }

}

app.post("/register", login_error, async (요청, 응답, next) => {
    // login_error(요청, 응답, next);
    let hash_password = await bcrypt.hash(요청.body.password, 9);

    await db.collection('user').insertOne({ 
      username : 요청.body.username, 
      password : hash_password
    });

    응답.redirect("/");
  // if(요청.body.username =='' || 요청.body.password == ''){
  //   응답.send("비어있는칸이 있습니다");
  // }
  // else{
  //   let hash_password = await bcrypt.hash(요청.body.password, 9);

  //   await db.collection('user').insertOne({ 
  //     username : 요청.body.username, 
  //     password : hash_password
  //   });
  //   응답.redirect("/");
  // }
  
})

app.use('/shop', require('./routes/shop.js'))


app.get('/search', (req, res) => {
  console.log(req.query.val)

})