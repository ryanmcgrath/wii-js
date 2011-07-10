/**
 *	util.js
 *
 *	A basic utility wrapper; anything extra that's often re-used should
 *	find its way here (e.g, debuggerDiv, bind, etc).
 *
 *	@Author: Ryan McGrath <ryan@venodesigns.net>
 *	@Requires: wii.js
 */

Wii.util = {
	/**
	 *	Wii.util.debug(err);
	 *
	 *	The Wii has... such little options for debugging, but we can try and make this a bit nicer.
	 *	This accepts a stack trace (see example code below) and then outputs it to the screen.
	 *
	 *	try { ... } catch(e) { Wii.util.debug(e); }
	 */
	debug: function(err) {
		if(Wii.debuggerDiv === null) {
			Wii.debuggerDiv = document.createElement('div');
			
			Wii.debuggerDiv.style.cssText = [
				'width: 90%;',
				'height: 90%;',
				'padding: 10px;',
				'font-size: 26px;',
				'font-family: monospace;',
				'overflow: scroll',
				'position: absolute;',
				'top: 10px;',
				'left: 10px;',
				'color: #f9f9f9;',
				'background-color: #010101;'
			].join('');
			
			document.body.appendChild(Wii.debuggerDiv);
		}
		
		if(typeof err === 'string') {
			Wii.debuggerDiv.innerHTML = err;
		} else {
			var msg = '';
			for(var e in err) { msg += e + '=' + err[e] + '<br>'; }
			Wii.debuggerDiv.innerHTML = msg;
		}
		
		Wii.debuggerDiv.style.display = 'block';
	},
	
	/**
	 *	Wiimote.util.bind(bindReference, fn)
	 *
	 *	Takes a reference (an object to scope to "this" at a later runtime) and binds it to a function (fn).
	 *
	 *	@param bindReference - An object to set as the "this" reference for a later function call.
	 *	@param fn - A function to bind the "this" object for.
	 *	@returns fn - A new function to pass around, wherein it's all scoped as you want it.
	 */
	bind: function(bindReference, fn) {
		return function() {
			return fn.apply(bindReference, arguments);
		};
	}	
};
