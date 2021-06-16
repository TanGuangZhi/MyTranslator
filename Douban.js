{
	"translatorID": "fc353b26-8911-4c34-9196-f6f567c93901",
	"label": "Douban",
	"creator": "氦客船长<TanGuangZhi@foxmail.com>,Ace Strong<acestrong@gmail.com>",
	"target": "^https?://(www|book)\\.douban\\.com/(subject|doulist|people/[a-zA-Z._]*/(do|wish|collect)|.*?status=(do|wish|collect)|group/[0-9]*?/collection|tag)",
	"minVersion": "2.0rc1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-16 09:58:03"
}

/*
   Douban Translator
   Copyright (C) 2009-2010 TAO Cheng, acestrong@gmail.com

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// #######################
// ##### Sample URLs #####
// #######################

/*
 * The starting point for an search is the URL below.
 * In testing, I tried the following:
 *
 *   - A search listing of books
 *   - A book page
 *   - A doulist page
 *   - A do page
 *   - A wish page
 *   - A collect page
 */
// http://book.douban.com/


function detectWeb(doc, url) {
	var pattern = /subject_search|doulist|people\/[a-zA-Z._]*?\/(?:do|wish|collect)|.*?status=(?:do|wish|collect)|group\/[0-9]*?\/collection|tag/;

	if (pattern.test(url)) {
		return "multiple";
	}
	else {
		return "book";
	}
}

function detectTitles(doc, url) {
	var pattern = /\.douban\.com\/tag\//;
	if (pattern.test(url)) {
		return ZU.xpath(doc, '//div[@class="info"]/h2/a');
	} else {
		return ZU.xpath(doc, '//div[@class="title"]/a');
	}
}

function doWeb(doc, url) {
	var articles = [];
	let r = /douban.com\/url\//;
	if (detectWeb(doc, url) == "multiple") {
		// also searches but they don't work as test cases in Scaffold
		// e.g. https://book.douban.com/subject_search?search_text=Murakami&cat=1001
		var items = {};
		// var titles = ZU.xpath(doc, '//div[@class="title"]/a');
		var titles = detectTitles(doc, url);
		var title;
		for (let i = 0; i < titles.length; i++) {
			title = titles[i];
			// Zotero.debug({ href: title.href, title: title.textContent });
			if (r.test(title.href)) { // Ignore links
				continue;
			}
			items[title.href] = title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrapeAndParse(doc, url));
		});
	}
	else {
		scrapeAndParse(doc, url);
	}
}




function trimTags(text) {
	return text.replace(/(<.*?>)/g, "");
}

function scrapeAndParse(doc, url) {
	Zotero.Utilities.HTTP.doGet(url, function (page) {
		var pattern;
		// 类型 & URL
		var itemType = "book";
		var newItem = new Zotero.Item(itemType);
		newItem.url = url;

		// 评分
		let dbScore = ZU.xpathText(doc, '//*[@id="interest_sectl"]/div[1]/div[2]/strong')
		dbScore= dbScore.trim()
		if(dbScore==="  "||dbScore===""){
			dbScore = "?"
		}
		
		// 评价人数
		let commentNum = ZU.xpathText(doc, '//*[@id="interest_sectl"]/div[1]/div[2]/div/div[2]/span/a/span')
		newItem.place = commentNum+"人评分"
		
		// 副标题
		pattern = /<span [^>]*?>副标题:<\/span>(.*?)<br\/>/;
		if (pattern.test(page)) {
			var subTitle = pattern.exec(page)[1].trim()
		}
		
		// 原作名
		pattern = /<span [^>]*?>原作名:<\/span>(.*?)<br\/>/;
		if (pattern.test(page)) {
			var originalTitle = pattern.exec(page)[1].trim()
			originalTitle = originalTitle.replace(/：/g,": ")
		}
		
		// 标题
		// let titleTemp = ""
		// pattern = /<h1>([\s\S]*?)<\/h1>/;
		// if (pattern.test(page)) {
		// 	var title = pattern.exec(page)[1];
		// 	title = Zotero.Utilities.trim(trimTags(title))
		// 	let originalTitlePre = " #"
		// 	if(!originalTitle){ // 当没有原名时,使用空字符
		// 		originalTitlePre = ""
		// 	}
		// 	if(title === subTitle){ // 判断下副标题与标题一样否,避免重复
		// 		titleTemp = "《"+title+"》"+commentNum+" "+"评"+" "+dbScore+originalTitlePre+originalTitle
		// 	} else {
		// 		titleTemp = "《"+title+" - "+subTitle+"》"+commentNum+" "+"评"+" "+dbScore+originalTitlePre+originalTitle			
		// 	}
		// 	titleTemp = titleTemp.replace(/( - )?undefined/g,"").replace("null","0")
		// 	titleTemp = titleTemp.replace(/&#39;/g,"'") // 替换部分ASCLL码
		// 	newItem.title = titleTemp
		// }

		// 极简版标题
		pattern = /<h1>([\s\S]*?)<\/h1>/;
		if (pattern.test(page)) {
			var title = pattern.exec(page)[1];
			title = Zotero.Utilities.trim(trimTags(title))
		}
		newItem.title = title
		
		// 短标题-->原作名
			newItem.shortTitle = originalTitle

		// 目录
		let catalogueList = ZU.xpath(doc, "//div[@class='indent' and contains(@id, 'dir_') and contains(@id, 'full')]")
		let catalogue = ""
		if(catalogueList.length>0){
			catalogue = "<h1>#摘录-《"+title+"》目录</h1>\n"+catalogueList[0].innerHTML
			newItem.notes.push({note:catalogue})
		}
		

		// 作者
		page = page.replace(/\n/g, "");
		page = page.replace(/&nbsp;/g,"")
		// Z.debug(page)
		// 豆瓣里作者一栏及其不规范,这里使用多正则匹配更多情况,提高兼容性
		let regexp = new RegExp() // 这里要把类型定义为RegExp,否则下面赋值后test(page)会失败 
		let regexp2 = new RegExp()
		let regexp3 = new RegExp()
		regexp = /<span>\s*<span[^>]*?>\s*作者<\/span>:(.*?)<\/span>/;
		regexp2 = /<span class="pl">作者:<\/span>\s*?<a href="https:\/\/book\.douban\.com\/author\/\d+\/">\s*?\S*?\s*?\S*?<\/a>\s*?<br>/
		regexp3 = /<span class="pl">作者:<\/span>\s*?<a href="https:\/\/book\.douban\.com\/author\/\d+\/">\s*?\S*?\s*?\S*?<\/a>\s+\//
		if (regexp2.test(page)) { 
			regexp = regexp2
		} else if(regexp3.test(page)){
			regexp = regexp3
		}
		
		if (regexp.test(page)) { 
			var authorNames = trimTags(regexp.exec(page)[0]);
			pattern = /(\[.*?\]|\(.*?\)|（.*?）)/g;
			authorNames = authorNames.replace(pattern, "").split("/");
			// // 国家
			// let country = RegExp.$1
			// country = country.replace("美国","美")
			// country = country.match(/[一-龥]+/g)
			// if(country===null){
			// 	country = [" "]
			// }

			// Zotero.debug(authorNames);
			let firstNameList = [] // 作者名列表
			let lastNameList = [] // 作者姓列表
			for (let i = 0; i < authorNames.length; i++) {
				let useComma = true;
				pattern = /[A-Za-z]/;
				if (pattern.test(authorNames[i])) {
				// 外文名
					pattern = /,/;
					if (!pattern.test(authorNames[i])) {
						useComma = false;
					}
				}
				// 实现欧美作者姓与名分开展示
				let patt1 = new RegExp("·.+\.+")
				let authorNameTemp = ""
				let ming = ""
				let xing = ""
				
				authorNames[i] = authorNames[i].replace(/作者:?(&nbsp;)?\s+/g, "")
				if(authorNames[i].indexOf(".")!= -1){ // 名字中带.的   如:斯蒂芬·D.埃平格
					authorNameTemp = authorNames[i].trim().split(".")
					xing = authorNameTemp.pop() // 取数组最后一个值作为名
					ming = authorNameTemp.join("·") // 姓氏
				} else {
					authorNames[i] =authorNames[i].replace(/•/g,"·") // 替换中文•分隔符为英文·
					authorNameTemp = authorNames[i].trim().split("·")
					xing = authorNameTemp.pop()
					ming = authorNameTemp.join("·")
				}
				// if(country[i]){
				// 	country = country[i].replace(/<\/a>/g,"")
				// }
			
				// if(country!=" "){
				// 	country = "["+country+"]"
				// }
				
				firstNameList.push(ming)
				lastNameList.push(xing)
				
				newItem.creators.push(
					{firstName:firstNameList[i],
					lastName:lastNameList[i],
					creatorType:"author",
					fieldMode:true
					}
				);
			}
		}
		

		// 译者
		pattern = /<span>\s*<span [^>]*?>\s*译者<\/span>:(.*?)<\/span>/;
		if (pattern.test(page)) {
			var translatorNames = trimTags(pattern.exec(page)[1]);
			pattern = /(\[.*?\])/g;
			translatorNames = translatorNames.replace(pattern, "").split("/");
			//		Zotero.debug(translatorNames);
			for (let i = 0; i < translatorNames.length; i++) {
				let useComma = true;
				pattern = /[A-Za-z]/;
				if (pattern.test(translatorNames[i])) {
				// 外文名
					useComma = false;
				}
				newItem.creators.push(Zotero.Utilities.cleanAuthor(
					Zotero.Utilities.trim(translatorNames[i]),
					"translator", useComma));
			}
		}

		// ISBN
		pattern = /<span [^>]*?>ISBN:<\/span>(.*?)<br\/>/;
		if (pattern.test(page)) {
			var isbn = pattern.exec(page)[1];
			newItem.ISBN = Zotero.Utilities.trim(isbn);
			// Zotero.debug("isbn: "+isbn);
		}

		// 页数
		pattern = /<span [^>]*?>页数:<\/span>(.*?)<br\/>/;
		if (pattern.test(page)) {
			var numPages = pattern.exec(page)[1];
			newItem.numPages = Zotero.Utilities.trim(numPages);
			// Zotero.debug("numPages: "+numPages);
		}

		// 出版社
		pattern = /<span [^>]*?>出版社:<\/span>(.*?)<br\/>/;
		if (pattern.test(page)) {
			var publisher = pattern.exec(page)[1];
			newItem.publisher = Zotero.Utilities.trim(publisher);
			// Zotero.debug("publisher: "+publisher);
		}

		// 定价
		pattern = /<span [^>]*?>定价:(.*?)<\/span>(.*?)<br\/?>/;
		if (pattern.test(page)) {
			var price = pattern.exec(page)[2];
			// price = "60"
			let prefix = price.match(/^((?!(\d+\.?\d*)).)*/g)[0] // 正则匹配前缀,如USD,CAD
			price = price.match(/(\d+\.?\d*)/g)[0]
			
			// 小数点后2为保持
			let numPrice = Number(price) 
			numPrice = numPrice.toFixed(2)
			
			// 车同轨书同文,一统金额样式
			if(prefix===""||prefix===" "||prefix.includes("CNY")){
				price = numPrice+" 元"
			} else {
				price = prefix+numPrice
			}
			
			newItem.rights = Zotero.Utilities.trim(price);
		}
		
		// 丛书
		pattern = /<span [^>]*?>丛书:<\/span>(.*?)<br\/>/;
		if (pattern.test(page)) {
			var series = trimTags(pattern.exec(page)[1]);
			series = series.replace(/ISBN: ?\d+/g,"")
			series = series.replace(/&nbsp;/g,"")
			newItem.series = Zotero.Utilities.trim(series);
		}

		// 出版年
		pattern = /<span [^>]*?>出版年:<\/span>(.*?)<br\/>/;
		if (pattern.test(page)) {
			var date = pattern.exec(page)[1];
			newItem.date = Zotero.Utilities.trim(date);
			// Zotero.debug("date: "+date);
		}
		
		// 其他
		let nowTime = getNowFormatTime() // 在评分后面新增时间,保持时效性
		newItem.extra = "D"+dbScore.trim()+" 📅"+nowTime
	
		
		// 标签
		var tags = ZU.xpath(doc, '//div[@id="db-tags-section"]/div[@class="indent"]/span/a[contains(@class, "tag") ]');
		for (let i in tags) {
			newItem.tags.push(tags[i].text);
		}
		
		// 作者简介
		let authorInfoList = ZU.xpath(doc, "//span[text()='作者简介']/parent::h2/following-sibling::div//div[@class='intro']")
		// 这里会获取平级的元素,当有多个时(有展开全部按钮)取最后一个
		let authorInfo = ""
		let authorInfotwo = ""
		if(authorInfoList.length>0){
			authorInfo = authorInfoList[authorInfoList.length-1].innerHTML
			// 正则提取<p>标签里面的元素,并添加换行
			authorInfo = authorInfo.match(/<[a-zA-Z]+.*?>([\s\S]*?)<\/[a-zA-Z]+.*?>/g)
			for(i=0;i<authorInfo.length;i++){
			authorInfo[i] = authorInfo[i].match(/<[a-zA-Z]+.*?>([\s\S]*?)<\/[a-zA-Z]+.*?>/g)
			authorInfotwo = authorInfotwo+RegExp.$1+"\n"
			}
		}
		
		// 内容简介
		// 获取展开全部按钮里面的内容
		let contentInfoList = ZU.xpath(doc, "//span[text()='内容简介']/parent::h2/following-sibling::div[@id='link-report']//div[@class='intro']")
		let contentInfo = ""
		let contentInfoTwo = ""
		if(contentInfoList.length>0){
			contentInfo = contentInfoList[contentInfoList.length-1].innerHTML
			contentInfo = contentInfo.match(/<[a-zA-Z]+.*?>([\s\S]*?)<\/[a-zA-Z]+.*?>/g)
			for(i=0;i<contentInfo.length;i++){
			contentInfo[i] = contentInfo[i].match(/<[a-zA-Z]+.*?>([\s\S]*?)<\/[a-zA-Z]+.*?>/g)
			contentInfoTwo = contentInfoTwo+RegExp.$1+"\n"
			}
		}
		
		let abstractNoteTemp = "作者简介:"+"\n"+authorInfotwo+"\n"+
		"内容简介:"+"\n"+contentInfoTwo

		newItem.abstractNote = abstractNoteTemp
		
	
		// // 调用qk api,实现html转md
		// var postUrl = "https://tools.getquicker.cn/api/MarkDown/Html2Markdown"
		// let postData = "{\"source\":\"<h1>string</h1>\"}"
		// let headers  = {
		//  	Accept: "text/plain",
		//  	"Content-Type": "application/json",
		// }
		// ZU.doPost(postUrl, postData, function(text){
			
		// }, headers)
		
		newItem.complete();
	});
}

//获取当前日期，格式YYYY-MM-DD
function getNowFormatDay(nowDate) {
	var char = "-";
	if(nowDate == null){
		nowDate = new Date();
	}
	var day = nowDate.getDate();
	var month = nowDate.getMonth() + 1;//注意月份需要+1
	var year = nowDate.getFullYear();
	//补全0，并拼接
	return year + char + completeDate(month) + char +completeDate(day);
}

//获取当前时间，格式YYYY-MM-DD HH:mm:ss
function getNowFormatTime() {
	var nowDate = new Date();
	var colon = ":";
	var h = nowDate.getHours();
	var m = nowDate.getMinutes();
	var s = nowDate.getSeconds();
	//补全0，并拼接
	return getNowFormatDay(nowDate) + " " + completeDate(h) + colon + completeDate(m) + colon + completeDate(s);
}

//补全0
function completeDate(value) {
	return value < 10 ? "0"+value:value;
}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://book.douban.com/subject/1355643/",
		"items": [
			{
				"itemType": "book",
				"title": "Norwegian Wood",
				"creators": [
					{
						"firstName": "Haruki",
						"lastName": "Murakami",
						"creatorType": "author"
					},
					{
						"firstName": "Jay",
						"lastName": "Rubin",
						"creatorType": "translator"
					}
				],
				"date": "2003",
				"ISBN": "9780099448822",
				"abstractNote": "When he hears her favourite Beatles song, Toru Watanabe recalls his first love Naoko, the girlfriend of his best friend Kizuki. Immediately he is transported back almost twenty years to his student days in Tokyo, adrift in a world of uneasy friendships, casual sex, passion, loss and desire - to a time when an impetuous young woman called Midori marches into his life and he has ..., (展开全部)",
				"libraryCatalog": "Douban",
				"numPages": "389",
				"publisher": "Vintage",
				"url": "https://book.douban.com/subject/1355643/",
				"attachments": [],
				"tags": [
					{
						"tag": "HarukiMurakami"
					},
					{
						"tag": "小说"
					},
					{
						"tag": "挪威森林英文版"
					},
					{
						"tag": "日本"
					},
					{
						"tag": "日本文学"
					},
					{
						"tag": "村上春树"
					},
					{
						"tag": "英文原版"
					},
					{
						"tag": "英文版"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.douban.com/doulist/120664512/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://book.douban.com/tag/认知心理学?type=S",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://book.douban.com/subject/26871144/",
		"items": [
			{
				"itemType": "book",
				"title": "《法国男人这么装 - 绅士穿搭法则》18 评 7.0 #MODE MEN",
				"creators": [
					{
						"firstName": "[法]朱利安",
						"lastName": "斯卡维尼",
						"creatorType": "author",
						"fieldMode": true
					},
					{
						"lastName": "盛柏",
						"creatorType": "translator"
					}
				],
				"date": "2016-8-1",
				"ISBN": "9787542655684",
				"abstractNote": "作者简介:\n作者简介\n朱利安·斯卡维尼，科班出身的建筑师，2012年开始在巴黎经营自己的店铺，在这之前曾经是一名自由裁缝。从2009年起，他给自己的博客stiff-collar.com撰稿并提供精美插图。\n\n译者简介\n盛柏，2006年10月在法国获得硕士学位后回国任教，研究的主要方向为法国现当代电影艺术、导演创作研究。2010年泰国朱拉隆功大学访问学者，2012年法国国立弗朗什-孔泰大学青年访问学者，现为复旦大学博士后。\n\n内容简介:\n腰封：伊夫·圣·罗兰说：“当我们穿得好的时候，什么都有可能发生。一件好衣服，是幸福的通行证。”\n封面：\n请您打开衣橱\n清点一下基本款的男装\n慢慢学会\n将它们好好搭配的技巧\n封底：\n向您展示男士衣橱里的10个基本款式；\n帮您找到与您搭配最为合适的衣着；\n为您提供颜色与图案相互组合的各种建议；\n教您掌握用配饰使个人风格更加完美；\n当然，还有贴心的服饰打理技巧和便于购买的商店地址。\n这是一本能帮您构建优雅风格必不可少的实用指南！\n通过色板给您呈现颜色和图案的搭配建议，一目了然！",
				"extra": "D7.0 📅2021-04-19 10:44:57",
				"libraryCatalog": "Douban",
				"numPages": "220",
				"place": "18人评分",
				"publisher": "上海三联书店",
				"rights": "68.00 元",
				"shortTitle": "法国男人这么装",
				"url": "https://book.douban.com/subject/26871144/",
				"attachments": [],
				"tags": [
					{
						"tag": "个人管理"
					},
					{
						"tag": "文化研究"
					},
					{
						"tag": "时尚"
					},
					{
						"tag": "有趣"
					},
					{
						"tag": "服装"
					},
					{
						"tag": "法国文学"
					},
					{
						"tag": "社会学"
					},
					{
						"tag": "穿搭"
					}
				],
				"notes": [
					{
						"note": "<h1>#摘录-《法国男人这么装》目录</h1>\n\n        前言……………………1<br>\n        衬衫……………………1<br>\n        针织衫…………………31<br>\n        裤子……………………47<br>\n        外套……………………69<br>\n        西服套装………………95<br>\n        领带……………………117<br>\n        大衣……………………137<br>\n        鞋………………………153<br>\n        内衣……………………175<br>\n        配饰……………………185<br>\n        参考书目………………205<br>\n        索引……………………208<br>\n     · · · · · ·     (<a href=\"javascript:$('#dir_26871144_full').hide();$('#dir_26871144_short').show();void(0);\">收起</a>)\n"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
