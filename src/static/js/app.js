(function(){

    _.each(document.querySelectorAll('.js--open-overlay'), function (el, index) {
        // Set an index for navigating within the overlay
        el.setAttribute('data-overlayindex', index+1);

        // Add event listeners to open the overlay when clicking on the image
        el.addEventListener('click', _openOverlay);
    });


    // Open the overlay from clicking an image
    function _openOverlay(event) {
        event.preventDefault();

        // Show the overlay
        document.body.classList.add('state--overlay-open');

        // Get the thing that triggered the overlay
        var postEl = findAncestor(event.target, 'js--open-overlay');

        // Render the overlay from the event.target data
        _renderOverlay(postEl);
    }


    function _closeOverlay(event) {
        event.preventDefault();

        // Hide the overlay
        document.body.classList.remove('state--overlay-open');
    }


    function _overlayNavigateTo(index) {
        event.preventDefault();
        var toImage = document.querySelector('.js--open-overlay[data-overlayindex="'+index+'"]');
        _renderOverlay(toImage);
    }


    // When rending an underscore template, we want top-level
    // variables to be referenced as part of an object. For
    // technical reasons (scope-chain search), this speeds up rendering
    _.templateSettings.variable = "sk";


    function _renderOverlay(postEl) {
        // Get the right template
        var template = _.template(document.querySelector(".template--photo-overlay").innerHTML);

        // Convert the DOMStringMap to a native Object
        var imageData = JSON.parse(JSON.stringify(postEl.dataset));

        var imageLength = document.querySelectorAll('.js--open-overlay').length;

        imageData.overlayindex = parseInt(imageData.overlayindex, 10);

        if (imageData.overlayindex == 0) {
            imageData.prevImageIndex = null;
        } else {
            imageData.prevImageIndex = imageData.overlayindex - 1;
        }

        if (imageData.overlayindex == imageLength) {
            imageData.nextImageIndex = null;
        } else {
            imageData.nextImageIndex = imageData.overlayindex + 1;
        }

        // Transform the image data into something a little nicer
        var ts = new Date(imageData.timestamp);
        var formattedTimestamp = ts.getFullYear() + '-'
             + ('0' + (ts.getMonth()+1)).slice(-2) + '-'
             + ('0' + ts.getDate()).slice(-2);

        imageData.timestamp = formattedTimestamp;

        if (!imageData.caption.length) {
            imageData.caption = '—';
        }

        var keywords = _.compact(imageData.tags.split(','));

        if (keywords.length) {
            var tagData = [];

            _.each(keywords, function (keyword) {
                tagData.push({
                    name: keyword,
                    url: '/tagged/'+keyword
                });
            });

            imageData.tags = tagData;
        }

        // Then pass it to the underscore template
        document.querySelector('.overlay').innerHTML = template({ image: imageData });

        // Add event listeners for the navigation
        _.each(document.querySelectorAll('.js--overlay-close'), function (el) {
            el.addEventListener('click', _closeOverlay);
        });

        document.querySelector('.js--overlay-prev').addEventListener('click', function (event) {
            _overlayNavigateTo(imageData.prevImageIndex);
        });

        document.querySelector('.js--overlay-next').addEventListener('click', function (event) {
            _overlayNavigateTo(imageData.nextImageIndex);
        });

        function onKeyDown(event) {
            var key = event.keyCode;

            if (key === 27) {
                _closeOverlay(event);
            }

            if (key === 37 && imageData.prevImageIndex) {
                event.preventDefault();
                _overlayNavigateTo(imageData.prevImageIndex);
            }

            if (key === 39 && imageData.nextImageIndex) {
                event.preventDefault();
                _overlayNavigateTo(imageData.nextImageIndex);
            }
        }

        window.onkeydown = onKeyDown;
    }


    // Helper to navigate the DOM
    function findAncestor(el, cls) {
        while ((el = el.parentElement) && !el.classList.contains(cls));
        return el;
    }

})();
