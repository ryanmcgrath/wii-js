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
