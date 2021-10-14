{
	"translatorID": "a8aec5fe-eff3-44b2-bc7b-be24629bd143",
	"label": "WoNiu",
	"creator": "氦客船长<TanGuangZhi@qq.com>",
	"target": "http://www.woniuxy.com/studentcourse/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-14 01:34:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 YOUR_NAME <- TODO
	
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
		return "multiple";
}

function getSearchResults(doc, checkOnly, url , info) {
	var items = {};
	var found = false;
	// 获取父类element元素,提取内部子元素如title,date
	var rows = doc.querySelectorAll('div#showNote div[class="row comment"]');

	let i = 0;
	for (let row of rows) {
		row = row.innerHTML;
		var parser = new DOMParser();
		var pageDoc = parser.parseFromString(row, "text/html");
		let button = "div#showNote div:nth-child("+(i+1)+") button"
		info.push({"title":pageDoc.querySelector("div p").textContent,"date":pageDoc.querySelector("div span").textContent,"button":button})
		// // TODO: check and maybe adjust
		let href = url;
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(pageDoc.querySelector("div p").textContent);
		if (!title) continue;
		if (checkOnly) return true;
		found = true;
		items[i] = title;
		i++;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var info = [];
		Zotero.selectItems(getSearchResults(doc, false, url, info), function (items) {
			for(let i in items){
				scrape(doc,url,info[i],i) 
			}
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url, info, i) {
	// 新建item
	var newItem = new Zotero.Item("blogPost");

	let title = info.title;
	let date = info.date;
	let button = info.button
	
	let noteContent = ""
	
	doc.querySelector(button).click()
	noteContent = doc.querySelectorAll('div[class="layui-layer-content"] div')
	noteContent = noteContent[i].innerHTML
	
	// 因为这里异步不知道出了什么问题,close这一步总是有问题(批量抓2个及以上的情况),
	// 所以暂时抓取全部的note内容,再由上部函数传入i值来控制note
	// clickButton(doc,button).then(() => {
	// 	// 获取HTML格式的笔记内容
	// 	noteContent = doc.querySelector('div[class="layui-layer-content"] div').innerHTML
	// 	close(doc).then(() =>{
	// 	newItem.notes.push({note:noteContent})
	// 	newItem.complete();
	// })
	// })
	newItem.title = title;
	newItem.date = date;
	newItem.url = url;
	newItem.notes.push({note:noteContent})
	newItem.complete();
}

function clickButton(doc,button){
	doc.querySelector(button).click()
	return new Promise((resolve) => setTimeout(resolve));
}

function close(doc){
	// 抓取完点击关闭按钮
	doc.querySelector('span.layui-layer-setwin a').click()
	return new Promise((resolve) => setTimeout(resolve,1000));
}

