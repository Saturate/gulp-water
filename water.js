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
		this.settings = Object.assign({
			content: './content/**/*.md',
			templates: './app/_templates/',
			contentPath: '/content',
			pages: '/pages',
			posts: '/posts'
		}, options);

		console.log('source', this.settings.content);

		// options is optional
		glob(this.settings.content, options, (er, files) => {
			console.log(this.logPrefix() + ' Building tree from:');
			console.log(this.logPrefix(), files);
		});

		let stream = vfs.src(this.settings.content);

		stream.pipe(this.waterTransform());

		return stream;
	}

	loadFiles() {

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
		let contents = file.contents.toString();

		// Get the frontmatter, this is meta data
		let fileMatter = matter(contents);

		// Compile the Markdown to HTML
		let transformedContents = marked(fileMatter.content);

		let env = nunjucks.configure(this.settings.templates);

		env.addFilter('date', function(str) {
			return str;
		});

		// Merge all options
		let renderOptions = Object.assign({ template: 'default.html' }, fileMatter.data, { contents: transformedContents });
		let res = env.render('./' + renderOptions.template, renderOptions);

		//console.log('CONTENT (%s - %s):\n\n', fileMatter.data.title, file, res, renderOptions);

		file.contents = new Buffer(res);

		let pathObj = this.parsePath(file.path);

		/*console.log(
			path.normalize(file.path),
			path.normalize(settings.posts),
			path.normalize(file.path).match(path.normalize(settings.posts))
		);*/

		// Check if it's in the posts dir.
		if(path.normalize(file.path).match(path.normalize(this.settings.posts))) {
		//	console.log('RENAME POST TO INDEX AND PUT IT IN FOLDER');
			pathObj.basename = 'index';
		}

		// Check if it's in the pages dir.
		if(path.normalize(file.path).match(path.normalize(this.settings.pages))) {
			let dirName = path.normalize(pathObj.dirname);
			let currentCollectionName = path.normalize(this.settings.pages);

			// Check if it's in the root folder, then we'll put it in a folder
			if(dirName.indexOf(currentCollectionName) === dirName.length - currentCollectionName.length && pathObj.basename !== 'index' ) {
				pathObj.dirname = pathObj.dirname + '/' + pathObj.basename + '/';
				pathObj.basename = 'index';
			} else {
				// TODO: 404 page should be special, on github it needs to be in the root and called 404.html
				pathObj.basename = 'index';
			}
		}

		file.path = path.join(pathObj.dirname, pathObj.basename + pathObj.extname);

		// TODO: Write paths corrently
		file.path = gutil.replaceExtension(file.path, '.html');

		file.path = file.path.replace('pages\\','');
		file.path = file.path.replace('posts\\','');

		console.log(this.logPrefix() + ' Transform: %s --> %s ', chalk.blue(originalFilePath.replace(process.cwd() + '\\content', '')), chalk.blue(file.path.replace(process.cwd() + '\\content', '')));
		callback(null, file);

	}
}

module.exports = Water;
