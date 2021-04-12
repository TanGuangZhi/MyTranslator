{
	"translatorID": "276cb34c-6861-4de7-a11d-c2e46fb8af28",
	"label": "Semantic Scholar",
	"creator": "Guy Aglionby",
	"target": "^https?://(www\\.semanticscholar\\.org/paper/.+|pdfs\\.semanticscholar\\.org/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-04-07 07:30:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Guy Aglionby
	
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

// See also https://github.com/zotero/translators/blob/master/BibTeX.js
var bibtex2zoteroTypeMap = {
	inproceedings: "conferencePaper",
	conference: "conferencePaper",
	article: "journalArticle"
};

function detectWeb(doc) {
	let citation = ZU.xpathText(doc, '//pre[@class="bibtex-citation"]');
	let type = citation.split('{')[0].replace('@', '');
	return bibtex2zoteroTypeMap[type];
}

function doWeb(doc, url) {
	if (url.includes('pdfs.semanticscholar.org')) {
		let urlComponents = url.split('/');
		let paperId = urlComponents[3] + urlComponents[4].replace('.pdf', '');
		const API_URL = 'https://api.semanticscholar.org/';
		ZU.processDocuments(API_URL + paperId, parseDocument);
	}
	else {
		parseDocument(doc, url);
	}
}

function parseDocument(doc, url) {
	let citation = ZU.xpathText(doc, '//pre[@class="bibtex-citation"]');
	let type = citation.split('{')[0].replace('@', '');
	const itemType = bibtex2zoteroTypeMap[type];

	var item = new Zotero.Item(itemType);

	// load structured schema data
	const schemaTag = doc.querySelector("script.schema-data");
	const schemaObject = JSON.parse(schemaTag.innerHTML);
	const article = schemaObject["@graph"][1][0];

	item.title = article.name;
	item.abstractNote = article.description;

	if (article.author) {
		article.author.forEach((author) => {
			item.creators.push(ZU.cleanAuthor(author.name, 'author'));
		});
	}
	item.publicationTitle = article.publication;
	item.date = article.datePublished;

	// viewOnSageUrl 
	let viewOnSageUrlList = ZU.xpath(doc, '//div[@class="flex-item primary-paper-link-button"]')
	let viewOnSageUrl = viewOnSageUrlList[0].innerHTML
	viewOnSageUrl.match(/href="(http.+\d)">/g)
	viewOnSageUrl = RegExp.$1
	item.url = viewOnSageUrl
	
	// 现在的时间
	let nowDate = getNowFormatTime()
	
	// tags
	let tagsList = ZU.xpathText(doc, '//li[@class="paper-meta-item"]/following-sibling::li').split(",");
	tagsList.shift() // 去除published Data
	item.tags = tagsList
	
	// 期刊
	let publication = tagsList[tagsList.length-1]
	item.publicationTitle = publication

	// extra: 引用量
	let references = ZU.xpathText(doc, '//span[@class="scorecard-stat__headline__dark"]');
	references = references.match(/\d+/g)[0]
	item.extra = "S"+references+" 📅"+nowDate
	
	// 界面转HTML
	// let page2HtmlList = ZU.xpath(doc, '//div[@class="app-page__content"]')
	// let page2Html = page2HtmlList[0].innerHTML
	// item.notes.push({note:page2Html})  
	
	item.attachments.push({
		url: url,
		title: "Semantic Scholar Link",
		mimeType: "text/html",
		snapshot: false
	});

	// if semantic scholar has a pdf as it's primary paper link it will appear in the about field
	const paperLink = article.about.url;
	
	if (paperLink.includes("pdfs.semanticscholar.org") || paperLink.includes("arxiv.org")) {
		alert(1)
		item.attachments.push({
			url: paperLink,
			title: "Full Text PDF",
			mimeType: 'application/pdf'
		});
	}

	// use the public api to retrieve more structured data
	const paperIdRegex = /\/(.{40})(\?|$)/;
	const paperId = paperIdRegex.exec(url)[1];
	const apiUrl = `https://api.semanticscholar.org/v1/paper/${paperId}?client=zotero_connect`;
	ZU.doGet(apiUrl, (data) => {
		let json = JSON.parse(data);
		item.DOI = json.doi;
		item.complete();
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
		"url": "https://www.semanticscholar.org/paper/TectoMT%3A-Modular-NLP-Framework-Popel-Zabokrtsk%C3%BD/e1ea10a288632a4003a4221759bc7f7a2df36208",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "TectoMT: Modular NLP Framework",
				"creators": [
					{
						"firstName": "Martin",
						"lastName": "Popel",
						"creatorType": "author"
					},
					{
						"firstName": "Zdenek",
						"lastName": "Zabokrtský",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"abstractNote": "In the present paper we describe TectoMT, a multi-purpose open-source NLP framework. It allows for fast and efficient development of NLP applications by exploiting a wide range of software modules already integrated in TectoMT, such as tools for sentence segmentation, tokenization, morphological analysis, POS tagging, shallow and deep syntax parsing, named entity recognition, anaphora resolution, tree-to-tree translation, natural language generation, word-level alignment of parallel corpora, and other tasks. One of the most complex applications of TectoMT is the English-Czech machine translation system with transfer on deep syntactic (tectogrammatical) layer. Several modules are available also for other languages (German, Russian, Arabic).Where possible, modules are implemented in a language-independent way, so they can be reused in many applications.",
				"libraryCatalog": "Semantic Scholar",
				"proceedingsTitle": "IceTAL",
				"shortTitle": "TectoMT",
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"notes": [],
				"seeAlso": [],
				"tags": [],
				"DOI": "10.1007/978-3-642-14770-8_33"
			}
		]
	}
]
/** END TEST CASES **/
