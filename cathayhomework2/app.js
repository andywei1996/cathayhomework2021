var express = require('express');
var app = express();    //開啟express
// var mongoose = require('mongoose');

const MongoClient = require('mongodb').MongoClient;

dburl = "mongodb://localhost:27017";    //MongoDB 3.0以後，DB名稱不再直接附在url之後，而是改為宣告成物件

//.get為http傳入方式，若要透過POST方式傳送，只需要改為.post即可。
//第一個引數為route路徑，意即可以透過不同的route路徑來觸發不同function！

//查詢功能
app.get('/q', function(req, res){
    var lastname, genderlim, phonenum, itemrole = '';
    var querycond = {};
    var location = []

    //參數判斷邏輯
    if(req.param('l')){   //縣市篩選
        var l = req.param('l');
        if (l == '台北市' || l =='臺北市'){
            location=['taipeicity'];
            
        }
        else if (l == '新北市' || l == '臺北縣' || l == '台北縣'){
            location=['newtaipeicity'];
        }
        
    }
    else{
        location = ['taipeicity', 'newtaipeicity'];
    }
    

    if(req.param('lm')!=null){  //姓氏篩選
        lastname = req.param('lm');
        //下面加入的是MongoDB官方秀出的正規查詢式
        //var holder = new RegExp(/lastname/);
        querycond.出租者 = { '$regex': lastname, '$options': 'i'};
        console.log(lastname);
    }

    if(req.param('gl')){                        //依性別篩選，gl值為0時為某性別可入住，1為只限定某性別入住
        if(req.param('gl') == '0'){
            if(req.param('cg')){                 
                switch (req.param('cg')){
                    case '男':
                        //利用RegExp()建立正則表達式，並搭配下方的$not操作符，以排除包含指定字串的document.
                        var limf = new RegExp(/限女/);
                        querycond.物件標題 = {'$not': limf};
                        querycond.性別要求 = {'$ne': '限女性'};
                        break;
                    case '女':
                        var limM = new RegExp(/限男/);
                        querycond.物件標題 = {'$not': limM};
                        querycond.性別要求 = {'$ne': '限男性'};
                        break;
                    default:
                        res.send({'message': '性別參數錯誤'});
                        return;
                }
            }
            else{
                res.send({'message': '性別選項錯誤'});
            }
        }
        else if(req.param('gl') == '1'){
            if(req.param('cg')){
                switch (req.param('cg')){
                    case '男':
                        querycond.性別要求 = '限男性';    break;
                    case '女':
                        querycond.性別要求 = '限女性';    break;
                    default:
                        res.send({'message': '性別參數錯誤'});
                        return;
                }
            }
            else{
                res.send({'message': '性別選項錯誤'});
            }
        }
        else{
            res.send({'message': '性別選項錯誤'});
        }
    }
    
    if(req.param('pn')){          //電話號碼查詢
        var pn = req.param('pn');
        if (pn.length == 10){
            phonenum = pn.slice(0, 4) + '-' + pn.slice(4, 7) + '-' + pn.slice(7,10);
            querycond.聯絡電話 = {'$regex' : phonenum };
            console.log(phonenum);
        }
    }
    if(req.param('pbh')){               //屋主自行刊登篩選
        switch(req.param('pbh')){
            case '0':
                //if(err) throw err;
                querycond.出租者身份 = {'$ne': '屋主'};   break;    //利用$ne操作符以選出指定值「不等於」給定值的文件
            case '1':
                querycond.出租者身份 = '屋主';  break;
            default:
                break;
        }
    }
    if(req.param('hg')){                //屋主性別
        switch(req.param('hg')){
            case '男':
                if (lastname){
                    querycond.出租者 = lastname+'先生';
                }
                else{
                    querycond.出租者 = {'$regex': '先生'};
                }
                break;    //利用$ne操作符以選出指定值「不等於」給定值的文件

            case '女':
                var sir = new RegExp(/先生/);   //利用RegExp()建立正則表達式，並搭配下方的$not操作符，以排除包含指定字串的document.
                if(lastname){
                    //$and的正確用法參照：https://docs.mongodb.com/v4.0/reference/operator/query/and/index.html
                    querycond.$and = [{'出租者' : {'$regex': lastname}}, {'出租者': {'$not': sir}} ]; 
                    console.log(querycond.$and);
                }
                else{
                    querycond.出租者 = {'$not': sir}
                }
                break;

            default:
                break;
        }

    }

    MongoClient.connect(dburl, function(err, client){
        if(err) throw err;
        var tresults = {};
        var resultindex = 0;
        var qindex = 0;
        var db = client.db('rental_db');    //DB物件

        for (l=0; l < location.length; l++){
            var stream = db.collection(location[l]).find(querycond).stream();

            stream.on('data', function(doc){
                    resultindex += 1;
                    tresults[resultindex] = doc;
                    //console.log(tresults[resultindex]);            
            });
            stream.on('err', function(){
                console.log('Data stream error.');
                
            });
            stream.on('end', function(){
                console.log(location[l] + ' Done.: '+resultindex);
                console.log('Total items: '+ resultindex);
                qindex += 1;
                if (qindex == location.length){
                    res.status(200).json(tresults);
                    
                }
                // res.status(200).json(tresults);
            }); 
        }        
    });

});


app.listen(3067, function(){        //監聽器
    console.log('Listening now on port 3067.');
});


