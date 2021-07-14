'use strict';
const express = require('express');
const bp = require('body-parser'); // Post
const ejs = require('ejs');
const session = require('express-session');
const mysql = require('mysql');
const cors = require('cors');

let query = sql => {
    return new Promise((resolve, reject) => {
        db.query(sql, (error, results) => {
            if (error) return reject(error);
            return resolve(results);
        });
    });
}
let insert = sql => {
    return new Promise((resolve, reject) => {
        db.query(sql, (error, results) => {
            if (error) return reject(error);
            return resolve(results);
        });
    });
}
let PS = json => {
    return JSON.parse(JSON.stringify(json));
}

const app = express();
const Port = 80;
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'nodejs',
    port: '3306'
});
db.connect();
app.use(cors());
app.set('views', __dirname + '/www');
app.engine('html', ejs.renderFile); // 解析 HTML
app.set('view engine', 'html'); // 解析 HTML
app.use(bp.json()); // 解析 POST
app.use(bp.urlencoded({ extended: true })); // 解析 POST
app.use('/css', express.static(__dirname + '/www/css')); // 靜態取得 (css)
app.use('/js', express.static(__dirname + '/www/js')); // 靜態取得 (js)
app.use('/img', express.static(__dirname + '/www/img')); // 靜態取得 (js)
app.use(session({ // 設定 session
    secret: 'keyboard cat', // 伺服器認證名字 (隨意)
    name: 'sessionID', // 使用者的 ID
    resave: false, // session 沒有變化是否保存
    saveUninitialized: true, // 未設定 session 名子也儲存
    cookie: {
        // secure: true, // 僅限 https 使用
        // maxAge: 100 * 1000, // 過期時間
    },
}))

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/education_stage', (req, res) => {
    res.render('education_stage');
});

app.get('/addpaper', (req, res) => {
    let user = req.session.user;
    if (user && user.account && user.password) // 已登入者
        res.render('addpaper');
    else
        res.redirect('/question');
});

app.get('/question', (req, res) => {
    let user = req.session.user;
    if (user && user.account && user.password) // 已登入者
        res.render('manage');
    else
        res.render('login');
});

app.get('/addquestion', (req, res) => {
    let user = req.session.user;
    if (user && user.account && user.password) // 已登入者
        res.render('addquestion');
    else
        res.redirect('/question');
});

app.get('/editquestion', (req, res) => {
    let user = req.session.user;
    if (user && user.account && user.password) // 已登入者
        res.render('editquestion');
    else
        res.redirect('/question');
});

app.post('/login', async (req, res) => {
    let user = req.body;
    let sql = `SELECT COUNT(id) as length FROM nodejs.users WHERE account Like '${user.account}'`;
    let rows = await query(sql);
    let length = rows[0].length;
    let ret = { status: 200 };
    if (length) {
        let sql = `SELECT * FROM nodejs.users WHERE account Like '${user.account}' AND password LIKE '${user.password}'`;
        let rows = await query(sql);
        if (rows.length) {
            req.session.user = rows[0];
        } else {
            ret.status = 300;
            ret.msg = '密碼錯誤';
        }
    } else {
        let sql = `INSERT INTO nodejs.users (account, password) VALUES ('${user.account}', '${user.password}')`;
        await insert(sql);
        sql = `SELECT * FROM nodejs.users WHERE account Like '${user.account}' AND password LIKE '${user.password}'`;
        let rows = await query(sql);
        req.session.user = rows[0];
    }
    res.json(ret);
});

app.post('/insertQuestion', async (req, res) => {
    let user = req.session.user;
    let data = req.body;
    let sql = `INSERT INTO nodejs.question (name, type, public, user_id, isAnser) VALUES 
        ('${data.name}', '${data.type}', '${Number(data.public == 'true')}', '${user.id}', '${Number(data.isAnser == 'true')}');`
    let ques = await insert(sql);
    let quesID = ques.insertId;
    if (data.input) {
        Object.entries(data.input).forEach(entry => {
            const [key, value] = entry;
            let sql = `INSERT INTO \`nodejs\`.\`queslist\` (\`name\`, \`ques_id\`, \`isAnser\`) VALUES ('${value.text}', '${quesID}', '${Number(value.isAnser == 'true')}')`;
            insert(sql);
        });
    }
    res.json({
        status: 200,
        msg: '新增完成'
    });
});

app.get('/question/data', async (req, res) => {
    let GET = req.query;
    let user = req.session.user;
    if (GET.userid) {
        user = {};
        user.id = GET.userid;
    }
    if (!user || !user.id) {
        res.json({ status: '300', msg: '未通過驗證' });
        return;
    }
    let questions = [];
    let sql = `SELECT * FROM nodejs.question WHERE user_id = ${user.id};`;
    let all_question = await query(sql);
    for (const ques of all_question) {
        if (ques.type == 2 || ques.type == 3) {
            let sql = `SELECT * FROM nodejs.queslist WHERE ques_id = ${ques.id};`;
            ques.option = await query(sql);
        }
        questions.push(PS(ques));
    }
    res.json(questions);
});

app.use((req, res) => res.status(404).render('404')); // 網址錯誤

app.listen(Port);