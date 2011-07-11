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

	/**
 *	wii.js
 *
 *	Provides a sane, event-based documented wrapper around the Wiimote controls
 *  and API inside the Opera-based Nintendo Wii web browser.
 *
 *	This is not produced by nor endorsed by Nintendo or Opera. I've written it
 *	on my own because I see a device that's sitting in millions of living rooms
 *	but being sorely neglected because a company couldn't get their act together
 *	in regards to third party development. ;)
 *
 *	@Author: Ryan McGrath <ryan@venodesigns.net>
 *	@Requires: Nothing.
 */

/*	Wii
 *
 *	Top level namespace. Contains information about the main event loop, etc.
 */
var Wii = {
	/**
	 *	A "global" reference to the Wiimotes we're currently watching. Lets us run
	 *	through on each loop/iteration and poll for a new status on it.
	 */
	extraRemotes: [],
	
	/**
	 *	A "global" reference to the (current) primary Wiimote. This can change if the
	 *	primary Wiimote runs out of battery, and the library shoul transparently account
	 *	for this.
	 */
	currentBrowsingRemote: null,
	
	/**
	 *	Internal flag for whether or not we've actually set some document event listeners.
	 *	A little messy, sure, but not the biggest guffaw in the world.
	 */
	setListeners: false,
	
	/**
	 *	A global debug flag. If this is enabled/set to true, any errors raised will be thrown
	 *	up on the screen for the Wii. Should be set when the initial .listen() request is fired.
	 *
	 *		e.g, Wii.listen({debug: true});
	 */
	debug: false,
	
	/**
	 *	The primary Wiimote depends on typical DOM-esque events to communicate what actions it's
	 *	doing, and the other three use a whole bitmask-esque scenario. This is a "global" Array of
	 *	the events we're interested in for the primary Wiimote.
	 *
	 *	We catch multiple begin/endpoints for these full event "scopes" for 
	 *	future use, as it seems like it'll probably be the most performant way
	 *	to do rapid-quick checks for the primary Wii-mote as to multiple-button
	 *	press scenarios (among some other things).
	 */
	primaryWiimoteEvts: ['mouseup', 'mousedown', 'keyup', 'keydown', 'keypress']
};

/**
 *	Wii.installListeners()
 *
 *	Install some basic low-level event listeners to monitor how
 *	the primary wii_remote is interacting with the browser; it's treated
 *	differently than the other wii_remotes, more as a "browsing" tool than
 *	a controller. Doesn't mean we can't try and mend the gap...
 */
Wii.installListeners = function() {
	for(var i = 0, j = Wii.primaryWiimoteEvts.length; i < j; i++) { 
		document.addEventListener(Wii.primaryWiimoteEvts[i], Wii.parsePrimaryWiimote, false);
	}
	
	/**
	 *	Since the Wii is already a fairly low-spec system, it's definitely worth
	 *	cleaning up after ourselves if we can get around to it. This should (hopefully)
	 *	take care of most of what we need to worry about.
	 */
	window.onbeforeunload = function() {
		for(var i = 0, j = Wii.primaryWiimoteEvts.length; i < j; i++) { 
			document.removeEventListener(Wii.primaryWiimoteEvts[i], Wii.parsePrimaryWiimote, false);
		}
		
		if(Wii.util.msgNode) Wii.util.msgNode.removeEventListener('click', Wii.util.hideDebugger, false);
	};
	
	/**
	 *	If this is all listening in debug mode, we wanna try and catch everything that could
	 *	possibly go wrong in the stack. try/catch is very expensive for the entire program, and can 
	 *	crash the Wii pretty easily if you push it too much.
	 *
	 *	What we'll do instead is just patch the seemingly un-documented window.Error function to suit our
	 *	debugging needs, and only try/catch while in debug mode in critical places (e.g, the constant polling
	 *	section would be... yeah, not a fun idea).
	 *
	 *	With this, "throw new Error(error)" will actually hit over to what we want, and anything else (outside code)
	 *	using it will get the on-screen Wii debug which is actually useful. That's why we bother doing this, instead
	 *	of just calling Wii.util.debug() everywhere. ;)
	 */
	if(Wii.debug) {
		Wii.util.originalErrFunction = window.Error;
		window.Error = function() {
			if(arguments.length > 0) Wii.util.debug(arguments[0]);
			else Wii.util.originalErrFunction.apply(this, arguments);
		}
	}
	
	return true;
};

/**
 *	Wii.listen()
 *	
 *	The main game loop. This must stay very performant; try to keep things as absolutely
 *	low-level as possible here.
 */
Wii.listen = function(optional_opts) {
	if(typeof optional_opts !== 'undefined') {
		if(typeof optional_opts.debug !== 'undefined' && optional_opts.debug) Wii.debug = true;
	}
	
	if(!Wii.setListeners) Wii.setListeners = Wii.installListeners();
	
	var i = Wii.extraRemotes.length;
	
	while(i--) {
		/*	Check if it's enabled; returns a kPadStatus object if so. */
		var wii_remote = Wii.extraRemotes[i],
			wii_remoteCurrStatus = wii_remote.isEnabled();
		
		/*	If it's enabled, huzzah, do some checks and fire appropriate events. */
		if(wii_remoteCurrStatus) {
			/**
			 *	Do this check here as well, as the primary wiimote might've changed... 
			 *	Note that we don't remove it from the internal remote tracking Array; this is because
			 *	if the remote that _was_ the primary one comes back online, it'll take over as the
			 *	primary one again as it's the lowest ID in terms of all remotes. This check here will
			 *	ensure that whatever remote is the current primary one will default to using other
			 *	dispatched events instead of bitwise checks, but should all default back if another one
			 *	comes online.
			 */
			if(wii_remoteCurrStatus.isBrowsing) {
				Wii.currentBrowsingRemote = wii_remote;
			} else {
				/*	Update these on each poll, since we've got the data anyway. */
				wii_remote.x = wii_remoteCurrStatus.dpdScreenX;
				wii_remote.y = wii_remoteCurrStatus.dpdScreenY;
								
				for(var evt in wii_remote.evtsInterestedIn) {
					var evtHappened = Wii.DISPATCHER[evt](wii_remote, wii_remoteCurrStatus);
					if(evtHappened) wii_remote.evtsInterestedIn[evt](wii_remote, wii_remoteCurrStatus);
				}
			}
		}
	}
	
	/**
	 *	This is a better choice than working with intervals; it keeps the amount of "spasm" responses
	 *	that one would normally get on the Wii to a bare minimum. This is due to how the two types of
	 *	timers in JS work - intervals will queue up no matter what, and if there's a backlog, rapidly
	 *	fire through all of them. Timeouts are guaranteed to always have their delay, even though at points
	 *	it may end up being more (or less) than 100ms.
	 *
	 *	Note that this is set to 100ms - any lower, and the Wii becomes very unresponsive for some reason. The
	 *	web browser is... odd, not sure what the deal is. 100ms should be enough for most cases though...
	 */
	return setTimeout(Wii.listen, 100);
};

/**
 *	Wii.parsePrimaryWiimote(e)
 *
 *	The Wii browser environment is... quite oddball at times. You see, the 
 *	primary Wii remote is treated differently than the other Wiimotes; it uses
 *	browser-based events (keydown, mouseup, etc) to communicate which buttons have
 *	been pressed.
 *
 *	The "primary" Wiimote can also change at any given time (loss of battery in the main, etc).
 *
 *	Luckily, it's not -impossible- to catch this internally. Our main library event loop catches
 *	if a given Wiimote is marked as the primary one, and will not attempt bitwise operations on it,
 *	merely wait for standard DOM events to trickle up and handle firing them appropriately.
 *
 *	...ugh.
 *	
 *	This method is a callback for any DOM-event listeners; accepts an event as its argument.
 */
Wii.parsePrimaryWiimote = function(e) {
	/*	Cancel whatever the default was, because we're going to try and normalize everything. */
	e.preventDefault();

	var wii_remote = Wii.currentBrowsingRemote,
		wii_remoteCurrStatus = wii_remote.isEnabled(),
		buttonPressed = Wii.PRIMARY_CONTROLLER_DISPATCHER[wii_remote.opts.horizontal ? 'horizontal' : 'vertical'][e.keyCode];
	
	/*	Grab these first, and on every pass. */
	wii_remote.x = wii_remoteCurrStatus.dpdScreenX;
	wii_remote.y = wii_remoteCurrStatus.dpdScreenY;
	
	/**
	 *	Filter down and figure out which "event" we're really looking at based on code
	 *	matchups; this gets messy pretty quickly...
	 */
	if(typeof buttonPressed !== 'undefined' && typeof wii_remote.evtsInterestedIn[buttonPressed] === 'function') {
		wii_remote.evtsInterestedIn[buttonPressed](wii_remote, wii_remoteCurrStatus);
	}
	
	/**
	 *	Due to the difference in how these controls are caught, we need a second set of roll/distance-changes
	 *	run here. Luckily, we can just re-use the dispatcher functions.
	 */
	if(typeof wii_remote.evtsInterestedIn['roll_change'] === 'function') {
		if(Wii.DISPATCHER['roll_change'](wii_remote, wii_remoteCurrStatus)) {
			wii_remote.evtsInterestedIn['roll_change'](wii_remote, wii_remoteCurrStatus);
		}
	}
	
	if(typeof wii_remote.evtsInterestedIn['distance_change'] === 'function') {
		if(Wii.DISPATCHER['distance_change'](wii_remote, wii_remoteCurrStatus)) {
			wii_remote.evtsInterestedIn['distance_change'](wii_remote, wii_remoteCurrStatus);
		}
	}
	
	/* Doing this in conjunction with preventDefault() halts an odd clicking bug or two. */
	return false;
};

/**
 *	Wii.PRIMARY_CONTROLLER_DISPATCHER
 *
 *	In order to keep things as performant as possible, we want DOM events (for the primary controller)
 *	to also be a 1:1 hash map lookup. This is PRIMARILY for the primary ("browsing") controller; all other
 *	controllers get their operations routed through the DISPATCHER below. The keys below are keyCodes.
 */
Wii.PRIMARY_CONTROLLER_DISPATCHER = {
	vertical: {
		0: 'pressed_a',
		13: 'pressed_a', /* Older versions of the Wii Browser...? */
		170: 'pressed_minus',
		171: 'pressed_b',
		172: 'pressed_1',
		173: 'pressed_2',
		174: 'pressed_plus',
		175: 'pressed_up',
		176: 'pressed_down',
		177: 'pressed_right',
		178: 'pressed_left'
	},
	horizontal: {
		0: 'pressed_a',
		13: 'pressed_a', /* Older versions of the Wii Browser...? */
		170: 'pressed_minus',
		171: 'pressed_b',
		172: 'pressed_1',
		173: 'pressed_2',
		174: 'pressed_plus',
		175: 'pressed_left',
		176: 'pressed_right',
		177: 'pressed_up',
		178: 'pressed_down'			
	}	
};

/**
 *	Wii.DISPATCHER
 *
 *	A table of the supported events that we watch for in our game loop, then fire off for respective
 *	Wiimotes. Each index is a function that does a check and returns true or false.
 *
 *	Many of these functions use bitwise comparisons. Read up on it if you're not familiar. Note that
 *	we also take into account the orientation of the device here!
 */
Wii.DISPATCHER = {
	/**
	 *	These functions depend on whether or not the controller is meant to be in horizontal mode
	 *	or not. Quite... different.
	 */
	'pressed_up': function(wii_remote, wii_remoteStatus) {
		if(wii_remote.opts.horizontal) return wii_remoteStatus.hold & 2;
		return wii_remoteStatus.hold & 8; 
	},
	'pressed_right': function(wii_remote, wii_remoteStatus) { 
		if(wii_remote.opts.horizontal) return wii_remoteStatus.hold & 4;
		return wii_remoteStatus.hold & 2; 
	},
	'pressed_down': function(wii_remote, wii_remoteStatus) {
		if(wii_remote.opts.horizontal) return wii_remoteStatus.hold & 1;			
		return wii_remoteStatus.hold & 4; 
	},
	'pressed_left': function(wii_remote, wii_remoteStatus) { 
		if(wii_remote.opts.horizontal) return wii_remoteStatus.hold & 8;						
		return wii_remoteStatus.hold & 1; 
	},
	
	'pressed_plus': function(wii_remote, wii_remoteStatus) { return wii_remoteStatus.hold & 16; },
	'pressed_minus': function(wii_remote, wii_remoteStatus) { return wii_remoteStatus.hold & 4096; },
	'pressed_2': function(wii_remote, wii_remoteStatus) { return wii_remoteStatus.hold & 256; },
	'pressed_1': function(wii_remote, wii_remoteStatus) { return wii_remoteStatus.hold & 512; },
	'pressed_b': function(wii_remote, wii_remoteStatus) { return wii_remoteStatus.hold & 1024; },
	'pressed_a': function(wii_remote, wii_remoteStatus) { return wii_remoteStatus.hold & 2048; },
	
	'roll_change': function(wii_remote, wii_remoteStatus) {
		var roll = Math.atan2(wii_remoteStatus.dpdRollY, wii_remoteStatus.dpdRollX);
		
		if(roll !== wii_remote.roll) {
			wii_remote.roll = roll;
			return true;
		}
		
		return false;
	},
	
	'distance_change': function(wii_remote, wii_remoteStatus) {
		if(wii_remoteStatus.dpdDistance !== wii_remote.last_known_distance_from_screen) {
			wii_remote.last_known_distance_from_screen = wii_remoteStatus.dpdDistance;
			return true;
		}
		return false;
	},
	
	/**
	 *	I'm keeping these noted here for legacy reasons, but by and large it's just not even
	 *	worth trying to use the Nunchuk with anything in the browser; the primary controller
	 *	can never read them, so there's a large chunk of functionality missing...
	 */
	'pressed_z': function(wii_remote, wii_remoteStatus) { return wii_remoteStatus.hold & 8192; },
	'pressed_c': function(wii_remote, wii_remoteStatus) { return wii_remoteStatus.hold & 16384; }
};/**
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
		if(!Wii.debug) return;
		
		if(Wii.util.msgNode === null) {
			Wii.util.msgNode = document.createElement('div');
			
			Wii.util.msgNode.style.cssText = [
				'min-width: 780px;',
				'padding: 10px;',
				'font-size: 28px;',
				'line-height: 32px;',
				'font-family: monospace;',
				'position: absolute;',
				'top: 15px;',
				'left: 0;',
				'color: #f9f9f9;',
				'background-color: #010101;',
				'border-bottom: 2px solid #42a2cc;',
				'opacity: .7;',
				'font-weight: bold;'
			].join('');
			
			Wii.util.msgNode.addEventListener('click', Wii.util.hideDebugger, false);
			document.body.appendChild(Wii.util.msgNode);
		}
		
		if(typeof err === 'string') {
			Wii.util.msgNode.innerHTML = err;
		} else {
			var msg = '';
			for(var e in err) { msg += '<span style="color: #42a2cc; font-weight: bold;">' + e + '</span>=' + err[e] + '<br>'; }
			Wii.util.msgNode.innerHTML = msg;
		}
		
		Wii.util.msgNode.style.display = 'block';
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
/**
 *	remote.js
 *
 *	Handles the subscribing to events portion of a Wii remote. It's best to think of this
 *	as a "request" object; it asks to be notified of events, and the actual events are 
 *	dispatched from the main wii.js file.
 *
 *	@Author: Ryan McGrath <ryan@venodesigns.net>
 *	@Requires: wii.js, util.js
 */

/**
 *	var wii_remote = new Wii.Remote(1, {...});
 *
 *	Instantiates a Wii Remote object. Events can be set on each of these objects,
 *	and the internal game loop will fire events based on the properties subscribed
 *	to here.
 *
 *	@param remote_id - Number, required. 1 - 4, dictates which Wiimote this object
 *		relates to.
 *	@param opts - Object, optional. Allows you to override internal settings and such,
 *		should you want different behavior.
 *	@returns Wii.Remote instance.
 */
Wii.Remote = function(remote_id, opts) {
	this.remote_id = remote_id;
	this.opts = opts;
	
	/**
	 *	Default these properties to undefined, since that's what
	 *	the Wii returns anyway, and it's worth it to try and stay (somewhat)
	 *	close to the core tech.
	 */
	this.x = undefined;
	this.y = undefined;
	this.roll = undefined;
	this.last_known_distance_from_screen = undefined;
	
	/**
	 *	If this is the "main" wii_remote, then the bitwise checks will fail
	 *	because it's treated more as a "browsing" device. For these events,
	 *	we'll just store the current wii_remote that's denoted as the "browsing"
	 *	device and let the normal event/key delegation take care of things.
	 *
	 *	The rest of the wii_remotes will go through the DISPATCHER checks that
	 *	they've subscribed to.
	 */
	var startupStatus = this.isEnabled();
	if(startupStatus) {
		if(!startupStatus.isBrowsing) {
			Wii.extraRemotes.push(this);
		} else {
			Wii.currentBrowsingRemote = this;
		}
	}
};

Wii.Remote.prototype = {
	opts: {
		/**
		 *	We default the controller to be in the vertical orientation; if
		 *	it's overridden as "horizontal" (false), we'll catch it for the different key
		 *	events and fire accordingly (e.g, the "up" button is different depending on
		 *	how the player is holding the controller).
		 */
		horizontal: false
	},
	
	/**
	 *	A hash of events that this Wii remote is interested in. Each
	 *	entry should be a key (evtName) with a value (response).
	 *	"evtName" is the event name that corresponds with boolean functions
	 *	in the DISPATCHER above, and the response is a remote-bound function
	 *	to call on that event.
	 */
	evtsInterestedIn: undefined,
	
	/**
	 *	Wiimote.isEnabled()
	 *
	 *	Determines the status of the wii_remote this object is curious about. Will return
	 *	an updated kPadStatus object if so, false if it's not responding or the data
	 *	is sent back as "invalid". This makes it so we don't bother sending events 
	 *	where they're not applicable.
	 *
	 *	@returns object or boolean.
	 */
	isEnabled: function() {
		var remote = opera.wiiremote.update(this.remote_id - 1);
		return (remote.isEnabled && remote.isDataValid ? remote : false);
	},
	
	/**
	 *	Wiimote.on(evtName, fn)
	 *
	 *	Allows you to listen for an event on a given Wiimote. Call this on an instantiated 
	 *	Wiimote; "this" will be scoped to the Wiimote object. ;)
	 *
	 *	@param evtName - String, a supported wii.js (DISPATCHER) event name.
	 *	@param fn - Function, callback function to be executed on the event firing. Will be scoped to the Wiimote.
	 *	@returns object or undefined - instantiated object this was called on to begin with, undefined if evtName is not supported.
	 */
	when: function(evtName, fn) {
		if(typeof Wii.DISPATCHER[evtName] !== 'undefined') {
			
			/**
			 *	THIS IS INCREDIBLY IMPORTANT, DO NOT REMOVE THIS!.
			 *
			 *	The Wii's browser has an (odd...?) bug wherein if you have a prototype chain
			 *	set up for a given object, and you default keys on the prototype chain to a blank object ("{}", for instance),
			 *	it will _NOT_ make this a unique object, it keeps pointers to the original object that was created by the system
			 *	for the first instantiated object.
			 *
			 *	This is, needless to say, unlike just about any other JS environment and threw me for a loop for a good 6 hours.
			 *	This line ensures that the first time this property is ever referenced, we get a fresh _CORRECTLY ALLOCATED_ chunk
			 *	of memory to play with and store things in.
			 *
			 *	Note that this also happens with Array structures, and conceivably anything else that would be using a copy-by-reference
			 *	technique instead of a full clone. We want an object for this case, though, so we're not doing iterations on event dispatch,
			 *	just a 1:1 lookup instead.
			 */
			if(this.evtsInterestedIn === undefined) this.evtsInterestedIn = {};
			
			this.evtsInterestedIn[evtName] = Wii.util.bind(this, fn);
			return this;
		}
		
		return undefined;
	}
};


	window.Wii = Wii;
})(window.opera && opera.wiiremote);
