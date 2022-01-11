var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if(!port){
  console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
  process.exit(1)
}

var server = http.createServer(function(request, response){
  var parsedUrl = url.parse(request.url, true)
  var pathWithQuery = request.url 
  var queryString = ''
  if(pathWithQuery.indexOf('?') >= 0){ queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
  var path = parsedUrl.pathname
  var query = parsedUrl.query
  var method = request.method

  /******** 从这里开始看，上面不要看 ************/

  const session = JSON.parse(fs.readFileSync('./session.json').toString())

  console.log('有个傻子发请求过来啦！路径（带查询参数）为：' + pathWithQuery)

  if(path === '/sign_in' && method ==='POST'){
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    const array = [];
    request.on('data', chunk =>{
      array.push(chunk)
    });
    request.on('end',()=>{
      const string = Buffer.concat(array).toString()
      const obj = JSON.parse(string);
      //查找有没有一样的user信息，如果有返回数组中满足函数的第一个元素的值，否则返回undefined
      const user = userArray.find(
        user=>user.name===obj.name && user.password === obj.password)
      if(user === undefined){
        response.statusCode = 400
        response.setHeader('Content-Type', 'text/json; charset=utf-8')
      }else{
        response.statusCode = 200
        //1.发一张票：Cookie  如果用户名密码正确，Set-Cookie就是发一张票，票的内容是这个人登录过了（logined=1）
        //2.另外注意，前端不允许操作cookie，所以cookie内容要加上HttpOnly
        //3.现在把logined替换成user_id，来让home.html知道是谁登录
        //4.再用js自带随机数session_id=${random()}代替user_id=${user.id}
        const random = Math.random()//把随机数记下来
        //把随机数记录到文件
        session[random] = {user_id: user.id}
        fs.writeFileSync('./session.json',JSON.stringify(session))
        response.setHeader('Set-Cookie', `session_id${random};HttpOnly`);
      }
      response.end();
    });
  } else if (path === '/home.html'){
    //写不出来
    //读取cookie
    const cookie = request.headers["cookie"];
    //目标四：
    let sessionId; //目标五，不获取userId，改获取sessionId,把下面userId都替换sessionId
    try {
      sessionId = cookie
      .split(';')
      .filter(s => s.indexOf('session_id=') >= 0)[0]
      .split('=')[1];
    } catch (error) { }
    //如果cookie存在，就把home文件的内容替换一下，注意读了文件要toString一下，默认不是string
    //目标四，把cookie === "logined=1"替换成userId，判断有没有userId
    if (sessionId && session[sessionId]){
      const userId = session[sessionId].user_id
      const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
      const user = userArray.find(user => user.id === userId);
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      let string =''
      if(user){
        string = homeHtml.replace('{{loginStatus}}','已登录').replace('{{user.name}}', user.name)
      }
      response.write(string);
    }else{
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      const string = homeHtml.replace('{{loginStatus}}','未登录').replace('{{user.name}}', '')
      response.write(string);
    }
    response.end();
  } else if (path === "/register" && method ==="POST"){
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    //为存数据到数据库，先读一下数据库（把json文件的数据反序列化得到数组）
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    //因为数据可能是分段上传的，所以把数据塞到数组里来一点一点获取数据
    const array =[]
    //监听请求而不是响应的data（上传）事件
    request.on('data',(chunk)=>{
      //每上传一点，就往数组push一点（chunk）数据
      array.push(chunk);
    });
    request.on('end',()=>{
      //结束的时候把数组打出来
      const string = Buffer.concat(array).toString()
      const obj = JSON.parse(string);
      //取数据库里最后一个用户的信息，为代码第44行添加信息做准备
      const lastUser = userArray[userArray.length - 1];
      const newUser = {
        //先往对象里写数据数据
        //如果是空数组，id为第一个，负责id为最后一个用户的id+1
        id: lastUser ? lastUser.id + 1 : 1,
        name: obj.name,
        password: obj.password
      };
      //把对象存数组里
      userArray.push(newUser)
      //再把数组userArray变字符串存到json文件里，要存的数据是第二个参数
      fs.writeFileSync('./db/users.json', JSON.stringify(userArray))
      response.end();
    })
  } else {
    response.statusCode = 200
    //默认首页
    const filePath = path === '/' ? '/index.html' : path;
    const index = filePath.lastIndexOf('.')
    //suffix是后缀的意思
    const suffix = filePath.substring(index)
    //用哈希表解决test/html test/css test/javascript ...
    const fileTypes = {
        '.html':'text/html',
        '.css':'text/css',
        '.js':'text/javascript',
        '.png':'image/png',
        '.jpg':'image/jpeg'
    }
    response.setHeader(
      'Content-Type', 
      `${fileTypes[suffix] || 'text/html'};charset=utf-8`)
    let content
    try{
        content = fs.readFileSync(`./public${filePath}`)
    }catch(error){
        content = '文件不存在'
        response.statusCode = 404;
    }
    response.write(content);
    response.end();
  }
  
    

  /******** 代码结束，下面不要看 ************/
})

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)