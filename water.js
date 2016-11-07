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

var waterTransform = function(options) {
	return through.obj(function(file, encoding, callback) {

		if (file.isNull()) {
			callback(null, file);
			return;
		}

		if (file.isStream()) {
			callback(new gutil.PluginError('gulp-water', 'Streaming not supported'));
			return;
		}

		// Merge defaults and options to get settings
		var settings = Object.assign({
			templates: './app/_templates/',
			contentPath: '/content',
			pages: '/pages',
			posts: '/posts'
		}, options);

		const originalFilePath = file.path;

		var contents = file.contents.toString();

		// Get the frontmatter, this is meta data
		var foo = matter(contents);

		// Compile the Markdown to HTML
		var transformedContents = marked(foo.content);

		var env = nunjucks.configure(settings.templates);

		env.addFilter('date', function(str) {
			return str;
		});

		// Merge all options
		var renderOptions = Object.assign({ template: 'default.html' }, foo.data, { contents: transformedContents });
		var res = env.render('./post.html', renderOptions);

		//console.log('CONTENT (%s - %s):\n\n', foo.data.title, file, res, renderOptions);

		file.contents = new Buffer(res);

		function parsePath(filePath) {
			var extname = path.extname(filePath);
			return {
				dirname: path.dirname(filePath),
				basename: path.basename(filePath, extname),
				extname: extname
			};
		}

		var pathObj = parsePath(file.path);
		//console.log(pathObj);

		/*console.log(
			path.normalize(file.path),
			path.normalize(settings.posts),
			path.normalize(file.path).match(path.normalize(settings.posts))
		);*/

		// Check if it's in the posts dir.
		if(path.normalize(file.path).match(path.normalize(settings.posts))) {
		//	console.log('RENAME POST TO INDEX AND PUT IT IN FOLDER');
			pathObj.basename = 'index';
		}

		// Check if it's in the pages dir.
		if(path.normalize(file.path).match(path.normalize(settings.pages))) {
			let dirName = path.normalize(pathObj.dirname);
			let currentCollectionName = path.normalize(settings.pages);

			// Check if it's in the root folder, then we'll put it in a folder
			if(dirName.indexOf(currentCollectionName) === dirName.length - currentCollectionName.length && pathObj.basename !== 'index' ) {
				pathObj.dirname = pathObj.dirname + '/' + pathObj.basename + '/';
				pathObj.basename = 'index';
			} else {
				pathObj.basename = 'index';
			}
		}

		file.path = path.join(pathObj.dirname, pathObj.basename + pathObj.extname);

		// TODO: Write paths corrently
		file.path = gutil.replaceExtension(file.path, '.html');

		file.path = file.path.replace('pages\\','');
		file.path = file.path.replace('posts\\','');

		var currentTime = chalk.grey(new Date().toLocaleTimeString().replace(/\./gim, ":"));
		console.log('['+currentTime+'] Water Transform: %s --> %s ', chalk.blue(originalFilePath.replace(process.cwd() + '\\content', '')), chalk.blue(file.path.replace(process.cwd() + '\\content', '')));

		callback(null, file);
	});
};


/*
fs.readdir('content/pages', function(err, files) {
	files.forEach();
});*/

//fs.createReadStream('README.md').pipe(test);

// Gulp
module.exports = waterTransform;
