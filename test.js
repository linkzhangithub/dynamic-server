const fs = require('fs')

//读数据库
const usersString = fs.readFileSync('./db/users.json').toString()
//JSON.parse可以把字符串变成对应的数组对象
const usersArray = JSON.parse(usersString)
console.log(usersArray)

//写数据库
const user3 = {id:3, name:'tom', password:'yyy'}
usersArray.push(user3)
//这个数据时本地的数组，还未存到数据库里，数据库是文件只能存字符串，因此用JSON.stringify变成字符串
const string = JSON.stringify(usersArray)
//有了这个string再写到数据库里
fs.writeFileSync('./db/users.json', string)