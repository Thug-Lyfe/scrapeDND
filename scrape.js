//const functions = require('firebase-functions')
const cors = require('cors')({origin:true})
const fs = require('fs');
const cheerio = require('cheerio')
const getUrls = require('get-urls')
const fetch = require('node-fetch')
const TurndownService = require('turndown');
const express = require('express')
const turndownService = new TurndownService()

const levelObj = {
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
                level = "Level " + em1.slice(index,index+1);
            }

            const name = $('.page-title.page-header span').html()
            
            const classes = bodyTag.indexOf('Bard') != -1 ? ( bodyTag.indexOf('Sorcerer') != -1 ? 'Bard, Sorcerer' : 'Bard' ) : 'Sorcerer'
            
            if (levelObj[level][name] == null){
                levelObj[level][name] = {
                    level:level,
                    markdown:markdown,
                    classes:classes,
                    name:name
                }
            }
            return levelObj[level][name];
        }else{
            return {};
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



const app = express()
const port = 3000

httpGetAsync("http://dnd5e.wikidot.com/spells:bard","document",function(res){
    scrapeTags(res.responseText).then(results => {
        httpGetAsync("http://dnd5e.wikidot.com/spells:sorcerer","document",function(res2){
            scrapeTags(res2.responseText).then(results => {
                fs.writeFile('PaladinSpellCompendium.md', JSON.stringify(levelObj,null,2), function (err) {
                    if (err) throw err;
                    console.log('Saved!');
                });
            })
        })
    });
})

