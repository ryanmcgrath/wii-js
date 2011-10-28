/**
 *	slides.js
 *
 *	Some incredibly ugly quick code for a slides-esque experience
 *	on both the Wii and browsers.
 *
 *	@Author: Ryan McGrath <ryan@venodesigns.net>
 *	@Requires: Nothing
 */

var slides = document.getElementsByTagName('div'),
	count = slides.length, 
	index = 0;

var sizeSlide = function sizeSlide(slide, oldIndex) {
	slides[oldIndex].style.display = 'none';
	slide.style.width = (window.innerWidth - 40) + 'px';
	slide.style.display = 'block';
}

document.addEventListener('keydown', function(e) {
	if(e.keyCode === 39 && (index + 1) < count) {
		sizeSlide(slides[index + 1], index);
		index = index + 1;
	}

	if(e.keyCode === 37 && (index - 1) >= 0) {
		sizeSlide(slides[index - 1], index);
		index = index - 1;
	}
}, false);

sizeSlide(slides[0], 0);
