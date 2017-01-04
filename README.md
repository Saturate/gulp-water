# gulp-water [![Build Status](https://travis-ci.org/Saturate/gulp-water.svg)](https://travis-ci.org/Saturate/gulp-water) [![Dependencies](https://david-dm.org/Saturate/gulp-water.svg)](https://david-dm.org/Saturate/gulp-water) [![NPM Version](https://img.shields.io/npm/v/gulp-water.svg)](https://www.npmjs.com/package/gulp-water)
Static Website Generator, for gulpjs.

## What is water?
Enables you yo take some content and grow it into a site. It does not optimize anything, it just makes Markdown into HTML.
It uses a special header in each file to get meta-data about the current file. For optimizing you could plug Water into a Gulp pipe, that could minify assets and such.

## Installation

```
npm install gulp-water --save
```

## Basic Usage

You can take a look at  my [AKJ.IO](https://github.com/Saturate/AKJIO) repo for a full usage example, with optimizations ect.

```js
const gulp = require('gulp');
const less = require('gulp-water');

function generate () {
	return new water({ source: './content/**/*.md' })
		.pipe(gulp.dest('./dist');
}

exports.generate = generate;
```

The content structure looks like this right now. All posts & pages have their own folder, that contains all the needed assets.

```
content
└───pages
│   └───about-me
│       │   about-me.md
│       │   awesome-picture-of-me.jpg
│       │   ...
│
└───posts
│   └───an-awesome-blog-post
│       │   an-awesome-blog-post.md
│       │   awesome-picture-of-me.jpg
│       │   ...
```

This is not the normal way where you would have a `/images/` folder, but it makes it a lot easier to control content, think components but for pages and blog posts. It makes it easy to update a picture, or delete a blog post about worrying about missing images, and a images folder that contains a lot of junk.

## License

Copyright 2016 - Allan Kimmer Jensen
