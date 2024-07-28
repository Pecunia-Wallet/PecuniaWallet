const speed = 1; // pixels at frame
const gap = getComputedStyle(document.querySelector("body"))
    .getPropertyValue('--gap'); // IMPORTANT: value should be equal to --gap variable at css
const marquee = document.querySelector("#marquee");

const newItem = () => {
    return marquee.querySelector("div").cloneNode(true);
}

const numerify = str => {
    return +str.replaceAll(/[^\d-]/g, "");
}

const fillMarquee = () => {
    while (marquee.querySelectorAll("div").length < 10 && (marquee.querySelectorAll("div").length < 3 || ((marquee.querySelector("div").clientWidth + numerify(gap)) * marquee.querySelectorAll("div").length - numerify(gap)) < window.innerWidth * 2))
    {
        marquee.append(newItem());
    }

    marquee.querySelectorAll("div").forEach(item => {
        if (item.style.position !== "absolute")
            item.style.position = "relative";
    });
};
fillMarquee();
window.addEventListener("resize", fillMarquee);

const render = () => {
    marquee.querySelectorAll("div").forEach(item => {
        if (item.offsetLeft < 0 && item.offsetLeft < -item.offsetWidth) {
            marquee.querySelectorAll("div").forEach(e => {
                e.style.left = numerify(gap) / 2 - 1 + "px";
            });
            item.remove();
            marquee.append(newItem());
        }
        item.style.left = `${numerify(item.style.left) - speed}px`;
    });
    requestAnimationFrame(render);
}

requestAnimationFrame(() => {
    render();
});