/**
 *    server.js
 *
 *    An example of a Node.js server that streams a set
 *    of events to a browser. This is primarily aimed at
 *    use with wii-js; since the wii's browser has a set of
 *    quirks like no other, this file can be expected to change.
 *
 *    This is commented possibly more liberally than it should be,
 *    as it's intended to be easily accessible by those who might not
 *    have worked with Node.js and/or Server Sent Events before.
 *
 *    @Author: Ryan McGrath <ryan@venodesigns.net>
 *    @Requires: Nothing, sans a little Node.js
 */
var DEBUG = true,
    PORT = 8080,
    http = require('http'),
    util = require('util'),
	fs = require('fs');

/**
 *  sendEvent()
 *
 *  Sends down a set of events roughly every ~5 seconds. Not that
 *  many would go so low, but sending more than once every ~500ms is
 *  not recommended. The Wii's browser has some odd memory limitations
 *  that aren't too much fun to be caught up in.
 *
 *	@response - response object/stream, where data gets written to.
 */
var sendEvents = function sendEvent(response) {
    var id = (new Date()).toLocaleTimeString(),
        data = (Math.floor(Math.random() * 10000) + 2);

    response.write('id: ' + id + '\n');
    response.write('data: ' + data + '\n');

    /**
     *    Set this up to re-send in a few seconds on the
     *    same request.
     */
    setTimeout(function() {
        sendEvents(response);
    }, 5000);
};

/**
 *	determineContentType(url)
 *
 *	Given a url, determines one of three content types that we care
 *	about. I'm an opinionated person and chose not to use Express here,
 *	but if you'd rather not deal with it the static module there is quite
 *	possibly your new best friend.
 *
 *	@url - string, url to be tested for content-type
 */
var determineContentType = function determineContentType(url) {
	if(/\.js/.test(url)) return 'text/javascript';
	if(/\.css/.test(url)) return 'text/css';
	return 'text/html';
};

/**
 *	Now we'll set up a simple server that listens our our port we set
 *	above, which will either distribute resources or events depending
 *	on the headers.
 */
http.createServer(function(request, response) {
	/**
	 *	All but useless to us...
	 */
	if(request.url === '/favicon.ico') {
		response.writeHead(404);
		response.end();
		return;
	}

    /**
     *    If things don't appear to be working, uncomment this and check out
     *    what's getting posted over. Certain headers need to be set by the browser;
     *    it's possible they're not getting set for some reason...
     */
    if(DEBUG && request.url !== '/favicon.ico') {
        util.puts('\n-----------------------------------------------------');
        util.puts('URL: ' + request.url);
        for(var key in request.headers) {
            util.puts(key + ': ' + request.headers[key]);
        }
    }

    /**
     *    See the comment about DEBUG/headers above. If we have proper headers, we'll
     *    start sending down a stream of events; if not, we'll assume it's a normal request
     *    and serve up some HTML/CSS/JS/etc.
     */
    if(request.headers.accept && request.headers.accept === 'text/event-stream') {
        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        sendEvents(response);
    } else {
        var file = request.url === '/' ? '/presentation.html' : request.url;

		response.writeHead(200, {'Content-Type': determineContentType(request.url)});
        fs.readFile(__dirname + file, 'utf-8', function(err, data) {
			if(err) throw err;
			response.write(data);
			response.end();
		});
    }
}).listen(PORT);

util.puts('\n--------------------------------------------------------------------');
util.puts('Server started and listening on port ' + PORT + '.');
