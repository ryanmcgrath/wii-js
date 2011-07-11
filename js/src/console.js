/**
 *	console.js
 *
 *	A lightweight wrapper for the now-common "console" object in browsers.
 *	Really just maps calls over to the wii-js internal Wii.util.debug() call,
 *	but exists so that if you use this in production code for whatever reason
 *	it could still be used to debug on the Wii.
 *
 *	Note that for this to work, you must be listening in debug mode!
 *
 *	@Author: Ryan McGrath <ryan@venodesigns.net>
 *	@Requires: wii.js, util.js
 */

if(typeof window.console === 'undefined') {
	window.console = {
		log: Wii.util.debug,
		debug: Wii.util.debug
	};
}
