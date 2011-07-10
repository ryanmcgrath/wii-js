#!/usr/bin/python

"""
	Build-script that brings together all the JS files for wii.js and
	takes care of minifying it down to a decent size.

	Before you even ask, no, we're not using uglify.js or Closure. Both
	of them are simply too aggressive for their own good; while normally this
	is an excellent feature to have, the JS engine that the Opera version on the Wii
	uses has a really odd set of quirks when you start trying to get smart with code,
	and YUI is the only minifier that doesn't appear to totally destroy it all through
	obfuscation. We'll forego a few bytes to have the thing working. ;P

	Uglify also requires Node.js. While I *love* Node, I'll wait until it's more readily
	available on Windows - there are a large amount of Windows-based programmers that I'm
	not keen on keeping out of development.
"""

import os
from subprocess import call

currdir = os.getcwd()

# The names of our JS files (minus the .js) that we want to build into the 
# final distribution.
DEPENDENCIES = [
	'wii',
	'util',
	'remote',
]

# What we're going to end up injecting as our core build, into core.js.
inject_build = ''

def minify_code(filename, final_filename):
	"""
		Dips out to Java/YUI compressor and runs the minifier on the specified file, dumping the
		output into the specified final_filename.
	"""
	#cmd = 'java -jar %s/utilities/yuicompressor-2.4.2.jar %s -o %s' % (currdir, filename, final_filename)
	call(['java', '-jar', '%s/utilities/yuicompressor-2.4.2.jar' % currdir, filename, '-o', final_filename])

# Run through each dependency, read it into "inject build", then do a simple split on the
# contents of core.js and wrap it all up.
for dependency in DEPENDENCIES:
	f = open('%s/js/src/%s.js' % (currdir, dependency), 'r')
	inject_build += f.read()
	f.close()

# Open core.js, split it on our build spot, wrap junks.
f = open('%s/js/src/core.js' % currdir, 'r')
core = f.read()
f.close()
core = core.split('/*{{inject_build}}*/')

# Write out a non-minified build.
f = open('%s/js/wii.js' % currdir, 'w')
f.write(core[0])
f.write(inject_build)
f.write(core[1])
f.close()

# Write out a minified build.
minify_code('%s/js/wii.js' % currdir, '%s/js/wii.min.js' % currdir)
