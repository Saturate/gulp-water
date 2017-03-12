/*
	WATER

	Enables you yo take some content and grow it into a site.

	It does not optimize anything, it just makes Markdown into HTML.
	It uses a special header in each file to get meta-data about the current file.

	For optimizing you could plug Water into a Gulp pipe, that could minify assets and such.

	TODO:
		- Buckets/Collcetions:
			A page is a collection with defaults, and blogposts are another.
			You can make your own if you like two blogs ect. These can be used for metadata also.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const through = require('through2');
const matter = require('gray-matter');
const marked = require('marked');
const nunjucks = require('nunjucks');
const gutil = require('gulp-util');
const chalk = require('chalk');
const glob = require('glob');
const vfs = require('vinyl-fs');

class Water {
	constructor(options) {
		// Merge defaults and options to get settings
		this.pageCache = {};
		this.settings = Object.assign({
			content: './content/**/*.md',
			templates: './app/_templates/',
			contentPath: '/content',
			collections: [{
				name: 'pages',
				path: '/pages',
				defaults: {

				}
			},{
				name: 'posts', // blog posts
				path: '/posts',
				defaults: {	// defaults for this collection of pages
					template: 'post.html'
				}
			}],
			pages: '/pages',
			posts: '/posts'
		}, options);

		// Load Meta Data
		let files = glob.sync(this.settings.content, Object.assign(options, { absolute: true }));
		files.forEach(this.parsePageFile.bind(this));

		// Start the transformation!
		let stream = vfs.src(this.settings.content);

		stream.pipe(this.waterTransform());

		return stream;
	}

	loadFiles() {

	}

	/*
		getCollection
		Get a collection that matches this page.
	*/
	getCollection(filePath) {
		let collection = this.settings.collections.find((collection) => {
			//console.log(collection.path, filePath, filePath.includes(collection.path));
			return filePath.includes(collection.path);
		});

		console.log('%s belongs in the %s collection', filePath, collection.name);

		return collection;
	}

	/*
		Generates link for website, for a item
	*/
	generateLink(pageItem, fileMatter) {
		console.log('generateLink', pageItem, fileMatter.data.permalink);

		if(fileMatter.data.permalink) {
			return fileMatter.data.permalink;
		}

		return fileMatter.meta.basename;
	}

	convertName(pageItem, fileMatter) {
		let pathObj = this.parsePath(pageItem);
		let dirName = path.normalize(pathObj.dirname);
		let currentCollectionName = path.normalize(fileMatter.meta.collection.path);

		console.log('convertName', pageItem, fileMatter.data.permalink);

		// Check if it's in the root folder, then we'll put it in a folder
		if(dirName.indexOf(currentCollectionName) === dirName.length - currentCollectionName.length && pathObj.basename !== 'index' && !fileMatter.data.permalink ) {
			dirName = dirName + '/' + pathObj.basename + '/';
			pathObj.basename = 'index';
		} else {
			// TODO: 404 page should be special, on github it needs to be in the root and called 404.html
			pathObj.basename = 'index';
		}

		dirName = dirName.replace(currentCollectionName,'');

		// If the permalink is a named .html file use that can skip convert
		if(fileMatter.data.permalink && fileMatter.data.permalink.includes('.html')) {
			return path.join(dirName, fileMatter.data.permalink);
		} else {
			return path.join(dirName, pathObj.basename + '.html');
		}
	}

	parsePath(filePath) {
		var extname = path.extname(filePath);
		return {
			dirname: path.dirname(filePath),
			basename: path.basename(filePath, extname),
			extname: extname
		};
	}

	waterTransform() {
		return through.obj(this.generateMarkup.bind(this));
	}

	logPrefix() {
		return '[' + chalk.grey(new Date().toLocaleTimeString().replace(/\./gim, ':')) + '] Water ';
	}

	isDraft(filePath) {
		return filePath.includes('_drafts');
	}

	// Get the frontmatter, this is meta data
	// Cache the result so that we can use it later-
	parsePageFile(filePath) {
		let fileContent = fs.readFileSync(filePath, 'utf-8');
		let fileMatter = matter(fileContent);
		console.log(this.logPrefix(), 'PATH',  filePath);

		fileMatter.meta = {
			collection: this.getCollection(filePath),
			draft: this.isDraft(filePath),
			basename: this.parsePath(filePath).basename
		};

		fileMatter.meta.link = this.generateLink(filePath, fileMatter);

		this.pageCache[path.normalize(filePath)] = fileMatter;
	}

	generateMarkup(file, encoding, callback) {
		if (file.isNull()) {
			callback(null, file);
			return;
		}

		if (file.isStream()) {
			callback(new gutil.PluginError('gulp-water', 'Streaming not supported'));
			return;
		}

		const originalFilePath = file.path;
		let fileMatter = this.pageCache[path.normalize(originalFilePath)];

		console.log(originalFilePath);

		// Compile the Markdown to HTML
		let transformedContents = marked(fileMatter.content);

		let env = nunjucks.configure(this.settings.templates);

		env.addFilter('date', function(str) {
			const monthNames = [
				'January', 'February', 'March',
				'April', 'May', 'June', 'July',
				'August', 'September', 'October',
				'November', 'December'
			];

			let date = new Date(str);
			let day = date.getDate();
			let monthIndex = date.getMonth();
			let year = date.getFullYear();

			return day + ' ' + monthNames[monthIndex] + ' ' + year;
		});

		env.addFilter('json', (str) => {
			return JSON.stringify(str, null, '\t');
		});

		env.addGlobal('water', () => {
			return {
				get: (name) => {
					var match  = [];
					Object.keys(this.pageCache).forEach((key) => {
						if( this.pageCache[key].meta.collection.name === name && !this.pageCache[key].meta.draft) {
							match.push(this.pageCache[key]);
						}
					});

					//console.log(match);

					return match;
				}
			};
		});

		// Merge all options
		let renderOptions = Object.assign({
			template: 'default.html',
			'__water': this.pageCache
		}, fileMatter.data, {
			contents: transformedContents
		});

		// Save markup to file stream
		let res = env.render('./' + renderOptions.template, renderOptions);
		file.contents = new Buffer(res);

		file.path = this.convertName(file.path, fileMatter);

		console.log(this.logPrefix() + ' Transform: %s --> %s ', chalk.blue(originalFilePath.replace(process.cwd() + '\\content', '')), chalk.blue(file.path.replace(process.cwd() + '\\content', '')));
		callback(null, file);
	}
}

module.exports = Water;
