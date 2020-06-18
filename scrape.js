//const functions = require('firebase-functions')
const cors = require('cors')({origin:true})

const fs = require('fs');
const cheerio = require('cheerio')
const getUrls = require('get-urls')
const fetch = require('node-fetch')
const TurndownService = require('turndown');
const express = require('express')
const turndownService = new TurndownService()
var turndownPluginGfm = require('turndown-plugin-gfm')
var gfm = turndownPluginGfm.gfm
turndownService.use(gfm)

var levelObj = {
    'Cantrip': {},
    'Level 1': {},
    'Level 2': {},
    'Level 3': {},
    'Level 4': {},
    'Level 5': {},
    'Level 6': {},
    'Level 7': {},
    'Level 8': {},
    'Level 9': {}
}


const scrapeTags = (text) => {
    var base = fs.readFileSync('./base.txt');
    const url = Array.from(getUrls(text));
    const requests = url.map( async url => {
        if (url.indexOf("dnd5e.wikidot.com/spell") != -1 ){
            const res = await fetch(url);
            const html = await res.text();
            const $ = cheerio.load(html);

            const bodyTag = $('#page-content').first().html();
            const markdown = turndownService.turndown(bodyTag);

            const em1 = $('em').first().toString()

            const index = em1.search(/\d/)
            var level = "Cantrip"
            if (index != -1){
                level = "Level "+em1.slice(index,index+1);
            }

            const name = $('.page-title.page-header span').html()
            if (name.toString().indexOf('(UA)') != -1){
                return false;
            }
            
            const classes = bodyTag.indexOf('Bard') != -1 ? ( bodyTag.indexOf('Sorcerer') != -1 ? 'Bard, Sorcerer' : 'Bard' ) : 'Sorcerer'
            var obj = {
                level:level,
                markdown:markdown,
                classes:classes,
                name:name
            }
            if (base.indexOf(name) == -1){
                obj.name += ' &#955';
            }
            levelObj[level][name] = obj
            return true;
        }else{
            return false;
        }
        
    });

    return Promise.all(requests);
}



const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
function httpGetAsync(theUrl,type, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    if (type != null){xmlHttp.responseType = type}
    xmlHttp.send(null);
}





var startHtml = '<!DOCTYPE html><html><body>'
var midHtml = '</script>'
var endHtml = '</body></html>'



function createFile(){
    
    httpGetAsync("http://dnd5e.wikidot.com/spells:bard","document",function(res){
        scrapeTags(res.responseText).then(results => {
            httpGetAsync("http://dnd5e.wikidot.com/spells:sorcerer","document",function(res2){
                scrapeTags(res2.responseText).then(results => {
                    Object.keys(levelObj).forEach(function(level,index){
                        var helper = []
                        for(var i in levelObj[level]){
                            helper.push(levelObj[level][i]);
                        }
                        helper.sort(function(a, b){
                            if (a.level == b.level){
                                if (a.name < b.name){
                                    return -1
                                }else{
                                    return 1
                                }
                            }else{
                                return a.level - b.level;
                            }
                        })
                        levelObj[level] = helper
                        
                    })
                    fs.writeFile('spells.json', JSON.stringify(levelObj,null,2), function (err) {
                        if (err) throw err;
                        console.log('Saved!');
                        prettyPrintFile();
                    });
                })
            })
        });
    })
}


function prettyPrintFile(){
    const source = require('./spells.json');
    var count = 1;
    let str = "# MutliClassMarco";
    str += "\n";

    for (const spellLevel in source) {
        str += "# " + spellLevel;
        str += "\n";

        source[spellLevel].forEach(function(spell){
            if (str.length / count > 5000){
                str += '\\page \n'
                count++;
            }
            str += "## " + spell.name;
            str += "\n";
            str += spell.markdown;
            str += "\n";
        })
        str += '\\page \n'

    }
    

    fs.writeFile('MutliClassMarco.md', str, function (err) {
        if (err) throw err;
        console.log('Done!');
    });
}

function prettyPrintFile2(){
    const source = require('./spells.json');
    var count = 1;
    let str = ""

    for (const spellLevel in source) {
        str += "### " + spellLevel;
        str += "\n";

        source[spellLevel].forEach(function(spell,index){
            
            str += " - " + spell.name;
            str += "\n";
        })

    }
    

    fs.writeFile('MutliClassMarcoTable.md', str, function (err) {
        if (err) throw err;
        console.log('Done!');
    });
}

function scrapeTags2(text){
    const $ = cheerio.load(text);

    const bodyTag = $('.main-content').first().html();
    const markdown = turndownService.turndown(bodyTag);
    return markdown;
}

function createFile2(){
    
    httpGetAsync("http://dnd5e.wikidot.com/bard","document",function(res){
        fs.writeFile('bard.md', scrapeTags2(res.responseText), function (err) {
            if (err) throw err;
            console.log('Done!');
        });
    })
    httpGetAsync("http://dnd5e.wikidot.com/bard:lore","document",function(res){
        fs.writeFile('bard_lore.md', scrapeTags2(res.responseText), function (err) {
            if (err) throw err;
            console.log('Done!');
        });
    })
    httpGetAsync("http://dnd5e.wikidot.com/sorcerer","document",function(res){
        fs.writeFile('sorcerer.md', scrapeTags2(res.responseText), function (err) {
            if (err) throw err;
            console.log('Done!');
        });
    })
    httpGetAsync("http://dnd5e.wikidot.com/sorcerer:wild-magic","document",function(res){
        fs.writeFile('sorcerer_wm.md', scrapeTags2(res.responseText), function (err) {
            if (err) throw err;
            console.log('Done!');
        });
    })
}
createFile2();
//prettyPrintFile2();
//prettyPrintFile();
//createFile();


const app = express()
const port = 3000

app.get('/spells', (req, res) => 

    res.sendFile(__dirname+'/spells.json', function (err) {
        console.log(__dirname +'/spells.json')
    if (err) {
      next(err)
    } else {
      console.log(__dirname +'/spells.json')
      prettyPrintFile();
    }
  })
)
app.get('/', (req, res) => res.sendFile(__dirname+'/index.html'));
//app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
