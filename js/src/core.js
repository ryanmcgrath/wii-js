/**
 *	core.js
 *	
 *	This is the main template file for bringing together
 *	the various libraries that power this entire little eco-system.
 *
 *	Building the releases requires Python (2.5+); simply run...
 *		
 *		python build.py
 *
 *	...from the /js/ directory.
 *
 *	@Author: Ryan McGrath <ryan@venodesigns.net>
 *	@Requires: Nothing, top-level file.
 */

;(function(running_inside_wii_browser) {
	/**
	 *	If we're not running inside the Nintendo Wii browser, bail out.
	 *	In the future, branch here for touch-enabled devices...?
	 */
	if(!running_inside_wii_browser) return false;

	/*{{inject_build}}*/

	window.Wii = Wii;
})(window.opera && opera.wiiremote);
