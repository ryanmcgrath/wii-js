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
	 *	A placeholder for the original Error function, since we pretty much overwrite it to actually
	 *	be useful to us. See "Wii.installListeners()" for more information on this.
	 */
	originalErrFunction: null,
	
	/**
	 *	Upon first call to Wii.util.debug(), this becomes a div that we keep
	 *	a reference to. It's primarily used for logging information to the screen
	 *	on the Wii itself.
	 */
	msgNode: null,
	
	/**
	 *	Wii.util.debug(err);
	 *
	 *	The Wii has... such little options for debugging, but we can try and make this a bit nicer.
	 *	This accepts a stack trace (see example code below) and then outputs it to the screen.
	 *
	 *	try { ... } catch(e) { Wii.util.debug(e); }
	 */
	debug: function(err) {
		if(Wii.util.msgNode === null) {
			Wii.util.msgNode = document.createElement('div');
			
			Wii.util.msgNode.style.cssText = [
				'min-width: 756px;',
				'padding: 10px;',
				'font-size: 28px;',
				'line-height: 32px;',
				'font-family: monospace;',
				'position: absolute;',
				'top: 10px;',
				'left: 10px;',
				'color: #f9f9f9;',
				'background-color: rgba(44, 44, 44, .7);',
				'border: 2px solid #42a2cc;'
			].join('');
			
			Wii.util.msgNode.addEventListener('click', Wii.util.hideDebugger, false);
			document.body.appendChild(Wii.util.msgNode);
		}
		
		if(typeof err === 'string') {
			Wii.debuggerDiv.innerHTML = err;
		} else {
			var msg = '';
			for(var e in err) { msg += '<span style="color: #42a2cc; font-weight: bold;">' + e + '</span>=' + err[e] + '<br>'; }
			Wii.debuggerDiv.innerHTML = msg;
		}
		
		Wii.debuggerDiv.style.display = 'block';
	},
	
	/**
	 *	Wii.util.hideDebugger()
	 *
	 *	Keep this around so we've got an easy reference to use for proper unloading
	 *	of event handlers once someone leaves this page. 
	 */
	hideDebugger: function() { this.style.display = 'none';	},
	
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
