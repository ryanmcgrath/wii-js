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
	currentBrowsingRemote: null,
	setKeyListeners: false,
	debuggerDiv: null	
};

/**
 *	Install some basic low-level event listeners to monitor how
 *	the primary wii_remote is interacting with the browser; it's treated
 *	differently than the other wii_remotes, more as a "browsing" tool than
 *	a controller. Doesn't mean we can't try and mend the gap...
 */
Wii.installKeyListeners = function() {
	document.addEventListener('mouseup', Wii.parsePrimaryWiimote, false);
	document.addEventListener('keydown', Wii.parsePrimaryWiimote, false);
	document.addEventListener('mousedown', Wii.parsePrimaryWiimote, false);
	document.addEventListener('keyup', Wii.parsePrimaryWiimote, false);

	/**
	 *	Some keys, like the directional ones, get... multiple events?
	 *	In this case, just shut. down. everything.
	 *
	 *	...and let the programmer deal with it.
	 */
	document.addEventListener('keypress', Wii.parsePrimaryWiimote, false);

	return true;
};

/**
 *	Wii.listen()
 *	
 *	The main game loop. This must stay very performant; try to keep things as absolutely
 *	low-level as possible here.
 */
Wii.listen = function() {
	if(!Wii.setKeyListeners) Wii.setKeyListeners = Wii.installKeyListeners();
	
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
				for(var evt in wii_remote.evtsInterestedIn) {
					var evtHappened = Wii.DISPATCHER[evt](wii_remote, wii_remoteCurrStatus);
					if(evtHappened) try { wii_remote.evtsInterestedIn[evt](wii_remote, wii_remoteCurrStatus); } catch(e) { alert(e.message); }
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
	
	/**
	 *	Filter down and figure out which "event" we're really looking at based on code
	 *	matchups; this gets messy pretty quickly...
	 */
	if(typeof buttonPressed !== 'undefined' && wii_remote.evtsInterestedIn[buttonPressed] !== 'undefined') {
		try { wii_remote.evtsInterestedIn[buttonPressed](wii_remote, wii_remoteCurrStatus); } catch(e) { alert(e.message); }
	}
	
	/* Doing this in conjunction with preventDefault() halts an odd clicking bug or two. */
	return false;
};

/**
 *	Wii.PRIMARY_CONTROLLER_DISPATCHER
 *
 *	In order to keep things as performant as possible, we want DOM events (for the primary controller)
 *	to also be a 1:1 hash map lookup. This is PRIMARILY for the primary ("browsing") controller; all other
 *	controllers get their operations routed through the DISPATCHER below.
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
	
	/**
	 *	I'm keeping these noted here for legacy reasons, but by and large it's just not even
	 *	worth trying to use the Nunchuk with anything in the browser; the primary controller
	 *	can never read them, so there's a large chunk of functionality missing...
	 */
	'pressed_z': function(wii_remote, wii_remoteStatus) { return wii_remoteStatus.hold & 8192; },
	'pressed_c': function(wii_remote, wii_remoteStatus) { return wii_remoteStatus.hold & 16384; }
};
