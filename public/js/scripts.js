document.addEventListener("DOMContentLoaded", function() {
    var img = document.getElementById("image");
    var lens = document.getElementById("lens");
    lens.style.backgroundImage = "url('" + img.src + "')";
    lens.style.backgroundSize = (img.width * 2) + "px " + (img.height * 2) + "px";
    img.addEventListener("mousemove", moveLens);
    lens.addEventListener("mousemove", moveLens);

    img.addEventListener("mouseenter", function() {
        lens.style.display = "block";
    });

    img.addEventListener("mouseleave", function() {
        lens.style.display = "none";
    });

    function moveLens(e) {
        var pos, x, y;
        e.preventDefault();
        pos = getCursorPos(e);
        x = pos.x - (lens.offsetWidth / 2);
        y = pos.y - (lens.offsetHeight / 2);
        if (x > img.width - lens.offsetWidth) {
            x = img.width - lens.offsetWidth;
        }
        if (x < 0) {
            x = 0;
        }
        if (y > img.height - lens.offsetHeight) {
            y = img.height - lens.offsetHeight;
        }
        if (y < 0) {
            y = 0;
        }
        lens.style.left = x + "px";
        lens.style.top = y + "px";
        lens.style.backgroundPosition = "-" + (x * 2) + "px -" + (y * 2) + "px";
    }

    function getCursorPos(e) {
        var a, x = 0,
            y = 0;
        e = e || window.event;
        a = img.getBoundingClientRect();
        x = e.pageX - a.left;
        y = e.pageY - a.top;
        x = x - window.pageXOffset;
        y = y - window.pageYOffset;
        return {
            x: x,
            y: y
        };
    }
});